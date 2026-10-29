import { BadRequestException } from '@nestjs/common';
import { AutomationsService, FlowNode } from './automations.service';
import { PrismaService } from '../../database/prisma.service';

describe('AutomationsService', () => {
  let service: AutomationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      automationFlow: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const mockEncryption: any = {
      encrypt: jest.fn(),
      decrypt: jest.fn((str) => str),
    };
    const mockMetaApi: any = {
      sendTextMessage: jest.fn(),
    };
    service = new AutomationsService(
      mockPrisma as unknown as PrismaService,
      mockEncryption,
      mockMetaApi,
    );
  });

  describe('validateFlowGraph', () => {
    it('should reject flow with no nodes', () => {
      expect(() => service.validateFlowGraph([])).toThrow(BadRequestException);
    });

    it('should reject flow with more than 25 nodes to prevent runaway execution', () => {
      const nodes: FlowNode[] = Array.from({ length: 26 }, (_, i) => ({
        id: `node-${i}`,
        type: i === 0 ? 'TRIGGER' : 'SEND_MESSAGE',
        label: `Node ${i}`,
        config: {},
      }));

      expect(() => service.validateFlowGraph(nodes)).toThrow(/Flow exceeds maximum allowed node limit/);
    });

    it('should reject flow if exactly one TRIGGER node is not present', () => {
      const nodes: FlowNode[] = [
        { id: '1', type: 'SEND_MESSAGE', label: 'Msg', config: {} },
        { id: '2', type: 'DELAY', label: 'Delay', config: {} },
      ];
      expect(() => service.validateFlowGraph(nodes)).toThrow(/Flow must contain exactly one root TRIGGER node/);
    });

    it('should detect and reject cyclic loops in bot flows', () => {
      // Node 1 -> Node 2 -> Node 3 -> Node 1 (Cycle!)
      const cyclicNodes: FlowNode[] = [
        { id: 'trigger', type: 'TRIGGER', label: 'Start', config: {}, next: 'node-2' },
        { id: 'node-2', type: 'SEND_MESSAGE', label: 'Hello', config: {}, next: 'node-3' },
        { id: 'node-3', type: 'DELAY', label: 'Wait', config: {}, next: 'trigger' }, // cycle back
      ];

      expect(() => service.validateFlowGraph(cyclicNodes)).toThrow(
        /Invalid flow graph: detected an infinite cycle\/loop/,
      );
    });

    it('should accept valid acyclic DAG flow', () => {
      const validNodes: FlowNode[] = [
        { id: 'trigger', type: 'TRIGGER', label: 'Start', config: {}, next: 'condition' },
        {
          id: 'condition',
          type: 'CONDITION',
          label: 'Branch on Help',
          config: {},
          branches: [
            { label: 'Help', condition: 'help', next: 'msg-help' },
            { label: 'Default', condition: '', next: 'msg-default' },
          ],
        },
        { id: 'msg-help', type: 'SEND_MESSAGE', label: 'Help info', config: { text: 'Here is info' } },
        { id: 'msg-default', type: 'SEND_MESSAGE', label: 'Default reply', config: { text: 'Welcome' } },
      ];

      expect(() => service.validateFlowGraph(validNodes)).not.toThrow();
    });
  });

  describe('simulateFlow', () => {
    it('should trace simulation execution steps without calling external messaging APIs', async () => {
      mockPrisma.automationFlow.findFirst.mockResolvedValue({
        id: 'flow-123',
        organizationId: 'org-test',
        name: 'Welcome Bot',
        steps: [
          { id: 'trig', type: 'TRIGGER', label: 'Start', config: {}, next: 'delay' },
          { id: 'delay', type: 'DELAY', label: 'Wait 5s', config: {}, next: 'msg' },
          { id: 'msg', type: 'SEND_MESSAGE', label: 'Reply', config: { text: 'Hello Alice!' } },
        ],
      });

      const simulation = await service.simulateFlow('org-test', 'flow-123', {
        messageText: 'Hello',
        contactPhone: '+1234567890',
      });

      expect(simulation.flowName).toBe('Welcome Bot');
      expect(simulation.totalStepsExecuted).toBe(3);
      expect(simulation.trace[0].type).toBe('TRIGGER');
      expect(simulation.trace[1].type).toBe('DELAY');
      expect(simulation.trace[2].type).toBe('SEND_MESSAGE');
    });
  });
});
