import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface FlowNode {
  id: string;
  type: 'TRIGGER' | 'CONDITION' | 'DELAY' | 'SEND_MESSAGE' | 'SEND_TEMPLATE' | 'ASSIGN_LEAD' | 'ADD_TAG';
  label: string;
  config: any;
  next?: string;
  branches?: { label: string; condition: string; next: string }[];
}

export interface CreateFlowDto {
  name: string;
  triggerType: 'MESSAGE_RECEIVED' | 'KEYWORD_MATCH' | 'NEW_LEAD';
  triggerConfig: any;
  steps: FlowNode[];
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listFlows(organizationId: string) {
    return this.prisma.automationFlow.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getFlow(organizationId: string, id: string) {
    const flow = await this.prisma.automationFlow.findFirst({
      where: { id, organizationId },
    });
    if (!flow) {
      throw new NotFoundException('Automation flow not found');
    }
    return flow;
  }

  async createFlow(organizationId: string, dto: CreateFlowDto) {
    // Validate Flow Graph Structure (DAG check, max nodes, edge integrity)
    this.validateFlowGraph(dto.steps);

    return this.prisma.automationFlow.create({
      data: {
        organizationId,
        name: dto.name,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig || {},
        steps: dto.steps as any,
        isActive: false,
      },
    });
  }

  async updateFlow(organizationId: string, id: string, dto: Partial<CreateFlowDto>) {
    await this.getFlow(organizationId, id);

    if (dto.steps) {
      this.validateFlowGraph(dto.steps);
    }

    return this.prisma.automationFlow.update({
      where: { id },
      data: {
        name: dto.name,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig,
        steps: dto.steps ? (dto.steps as any) : undefined,
      },
    });
  }

  async toggleActive(organizationId: string, id: string, isActive: boolean) {
    const flow = await this.getFlow(organizationId, id);

    if (isActive) {
      // Validate before enabling
      this.validateFlowGraph(flow.steps as unknown as FlowNode[]);
    }

    return this.prisma.automationFlow.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Graph Safety Validation:
   * 1. Max 25 nodes per flow
   * 2. Exactly one TRIGGER node as root
   * 3. All outgoing edge targets exist in the graph
   * 4. Acyclic check (detects and prevents infinite loops)
   */
  validateFlowGraph(nodes: FlowNode[]) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new BadRequestException('Flow must contain at least one trigger node');
    }

    if (nodes.length > 25) {
      throw new BadRequestException('Flow exceeds maximum allowed node limit (25 nodes)');
    }

    const nodeMap = new Map<string, FlowNode>();
    for (const node of nodes) {
      if (!node.id || !node.type) {
        throw new BadRequestException('Every node must have a unique id and type');
      }
      if (nodeMap.has(node.id)) {
        throw new BadRequestException(`Duplicate node ID detected: ${node.id}`);
      }
      nodeMap.set(node.id, node);
    }

    const triggers = nodes.filter((n) => n.type === 'TRIGGER');
    if (triggers.length !== 1) {
      throw new BadRequestException('Flow must contain exactly one root TRIGGER node');
    }

    // Verify edge targets exist
    for (const node of nodes) {
      if (node.next && !nodeMap.has(node.next)) {
        throw new BadRequestException(`Node "${node.id}" references non-existent target node "${node.next}"`);
      }
      if (node.branches) {
        for (const branch of node.branches) {
          if (branch.next && !nodeMap.has(branch.next)) {
            throw new BadRequestException(
              `Branch in node "${node.id}" references non-existent target node "${branch.next}"`,
            );
          }
        }
      }
    }

    // Detect Cycles (DFS traversal)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (node) {
        const neighbors: string[] = [];
        if (node.next) neighbors.push(node.next);
        if (node.branches) {
          for (const b of node.branches) {
            if (b.next) neighbors.push(b.next);
          }
        }

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor)) return true;
          } else if (recursionStack.has(neighbor)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    if (hasCycle(triggers[0].id)) {
      throw new BadRequestException(
        'Invalid flow graph: detected an infinite cycle/loop. Bot flows must be directed acyclic graphs (DAG).',
      );
    }
  }

  /**
   * Dry-Run Simulation Mode:
   * Traverses the flow with mock input message and returns step execution trace without sending real customer messages.
   */
  async simulateFlow(organizationId: string, id: string, sampleInput: { messageText: string; contactPhone?: string }) {
    const flow = await this.getFlow(organizationId, id);
    const nodes = flow.steps as unknown as FlowNode[];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const trace: any[] = [];
    const root = nodes.find((n) => n.type === 'TRIGGER');
    if (!root) return { success: false, trace: [] };

    let current: FlowNode | undefined = root;
    let stepCount = 0;

    while (current && stepCount < 25) {
      stepCount++;
      const stepTrace: any = {
        nodeId: current.id,
        type: current.type,
        label: current.label,
        timestamp: new Date().toISOString(),
      };

      if (current.type === 'CONDITION' && current.branches && current.branches.length > 0) {
        const text = sampleInput.messageText.toLowerCase();
        let matchedBranch = current.branches[0];

        for (const b of current.branches) {
          if (b.condition && text.includes(b.condition.toLowerCase())) {
            matchedBranch = b;
            break;
          }
        }

        stepTrace.outcome = `Matched condition: "${matchedBranch.condition || 'Default'}"`;
        trace.push(stepTrace);
        current = nodeMap.get(matchedBranch.next);
      } else {
        stepTrace.outcome = current.type === 'SEND_MESSAGE'
          ? `Dispatched message payload: "${current.config?.text || 'Hello'}"`
          : 'Executed step';
        trace.push(stepTrace);
        current = current.next ? nodeMap.get(current.next) : undefined;
      }
    }

    return {
      flowName: flow.name,
      totalStepsExecuted: trace.length,
      sampleInput,
      trace,
    };
  }
}
