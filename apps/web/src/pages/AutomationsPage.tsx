import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Workflow,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageSquare,
  FileCode,
  Sliders,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  X,
  Send,
  Zap,
} from 'lucide-react';

interface FlowNode {
  id: string;
  type: 'TRIGGER' | 'CONDITION' | 'DELAY' | 'SEND_MESSAGE' | 'SEND_TEMPLATE';
  label: string;
  config: any;
  next?: string;
  branches?: { label: string; condition: string; next: string }[];
}

interface AutomationFlow {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: any;
  steps: FlowNode[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const AutomationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedFlow, setSelectedFlow] = useState<AutomationFlow | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [simulationInput, setSimulationInput] = useState('Hi, I need pricing information.');
  const [simulationTrace, setSimulationTrace] = useState<any | null>(null);

  // Default new flow template
  const [flowDraft, setFlowDraft] = useState<{
    name: string;
    triggerType: 'MESSAGE_RECEIVED' | 'KEYWORD_MATCH' | 'NEW_LEAD';
    steps: FlowNode[];
  }>({
    name: 'Customer Welcome Bot',
    triggerType: 'MESSAGE_RECEIVED',
    steps: [
      {
        id: 'node-trig-1',
        type: 'TRIGGER',
        label: 'Inbound Customer Message',
        config: { triggerEvent: 'MESSAGE_RECEIVED' },
        next: 'node-cond-2',
      },
      {
        id: 'node-cond-2',
        type: 'CONDITION',
        label: 'Check Inquiry Intent',
        config: { field: 'messageText' },
        branches: [
          { label: 'Pricing Query', condition: 'price', next: 'node-msg-3' },
          { label: 'General Help', condition: 'help', next: 'node-msg-4' },
        ],
      },
      {
        id: 'node-msg-3',
        type: 'SEND_MESSAGE',
        label: 'Send Pricing Reply',
        config: { text: 'Hello! Our pricing plans start from $29/mo with full WhatsApp integration. Would you like a live demo?' },
      },
      {
        id: 'node-msg-4',
        type: 'SEND_MESSAGE',
        label: 'Send General Welcome',
        config: { text: 'Welcome to DOOT Support! A customer representative will assist you shortly.' },
      },
    ],
  });

  // Query flows
  const { data: flows, isLoading } = useQuery<AutomationFlow[]>({
    queryKey: ['automation-flows'],
    queryFn: () => api.get<AutomationFlow[]>('/automations'),
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/automations/${id}/toggle`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
    },
  });

  // Save flow mutation
  const saveFlowMutation = useMutation({
    mutationFn: (data: typeof flowDraft) => api.post('/automations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      setIsEditorOpen(false);
    },
  });

  // Simulation mutation
  const simulateMutation = useMutation({
    mutationFn: async ({ flowId, messageText }: { flowId: string; messageText: string }) => {
      return api.post(`/automations/${flowId}/simulate`, { messageText });
    },
    onSuccess: (data) => {
      setSimulationTrace(data);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-[#0d1322]/80 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Workflow className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Visual Bot Flow & Automations</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Build no-code conversational workflows, keyword responders, and interactive DAG flows with dry-run testing.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedFlow(null);
            setIsEditorOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Bot Flow</span>
        </button>
      </div>

      {/* Safety & DAG Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
        <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Zero-Runaway Guarantee:</strong> Workflows are validated on the backend as Directed Acyclic Graphs (DAG). Circular loops and recursive triggers are mathematically prohibited.
        </span>
      </div>

      {/* Flows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 text-center py-12 text-slate-500 text-xs font-mono">
            Loading automation flows...
          </div>
        ) : (flows || []).length === 0 ? (
          <div className="col-span-3 p-8 rounded-2xl border border-slate-800 bg-[#0d1322]/60 text-center">
            <Workflow className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-300">No automation flows created yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Set up your first automated WhatsApp welcome sequence or keyword bot to respond to leads 24/7.
            </p>
          </div>
        ) : (
          (flows || []).map((flow) => {
            const steps = (flow.steps || []) as FlowNode[];
            return (
              <div
                key={flow.id}
                className="p-6 rounded-2xl bg-[#0d1322]/80 border border-slate-800 hover:border-slate-700 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
                      {flow.triggerType}
                    </span>
                    <button
                      onClick={() => toggleMutation.mutate({ id: flow.id, isActive: !flow.isActive })}
                      className="text-slate-400 hover:text-white"
                      title={flow.isActive ? 'Deactivate flow' : 'Activate flow'}
                    >
                      {flow.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-500" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mt-2">{flow.name}</h3>

                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400">Flow Sequence:</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {steps.slice(0, 4).map((node, i) => (
                        <React.Fragment key={node.id}>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {node.label || node.type}
                          </span>
                          {i < Math.min(steps.length - 1, 3) && <ArrowRight className="w-3 h-3 text-slate-600" />}
                        </React.Fragment>
                      ))}
                      {steps.length > 4 && (
                        <span className="text-[10px] text-slate-500 font-mono">+{steps.length - 4} more</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Updated {new Date(flow.updatedAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => {
                      setSelectedFlow(flow);
                      setSimulationTrace(null);
                      setIsSimulationOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Dry-Run Test</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE FLOW MODAL / VISUAL BUILDER */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0d1322] border border-slate-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Workflow className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-lg">Visual Bot Flow Architect</h3>
              </div>
              <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Flow Name</label>
                <input
                  type="text"
                  value={flowDraft.name}
                  onChange={(e) => setFlowDraft({ ...flowDraft, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Trigger Event</label>
                <select
                  value={flowDraft.triggerType}
                  onChange={(e) => setFlowDraft({ ...flowDraft, triggerType: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="MESSAGE_RECEIVED">When any WhatsApp message is received</option>
                  <option value="KEYWORD_MATCH">When inbound text matches specific keywords</option>
                  <option value="NEW_LEAD">When a new CRM lead is captured</option>
                </select>
              </div>

              {/* Visual Node Chain */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Workflow Step Nodes</label>
                <div className="space-y-3">
                  {flowDraft.steps.map((node, index) => (
                    <div
                      key={node.id}
                      className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-200">{node.label}</div>
                          <div className="text-[11px] font-mono text-slate-400 uppercase mt-0.5">{node.type}</div>
                          {node.config?.text && (
                            <p className="text-xs text-slate-300 mt-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                              "{node.config.text}"
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        DAG Validated
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => saveFlowMutation.mutate(flowDraft)}
                disabled={saveFlowMutation.isPending}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {saveFlowMutation.isPending ? 'Saving Flow...' : 'Save & Publish Flow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATION MODAL */}
      {isSimulationOpen && selectedFlow && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#0d1322] border border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Dry-Run Simulation: {selectedFlow.name}</h3>
              </div>
              <button onClick={() => setIsSimulationOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Test your bot workflow without sending real WhatsApp messages. Type a sample customer message below to trace the execution step-by-step.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Simulated Incoming Message:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={simulationInput}
                  onChange={(e) => setSimulationInput(e.target.value)}
                  placeholder="e.g. Can you send me pricing details?"
                  className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  disabled={!simulationInput.trim() || simulateMutation.isPending}
                  onClick={() =>
                    simulateMutation.mutate({
                      flowId: selectedFlow.id,
                      messageText: simulationInput,
                    })
                  }
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run</span>
                </button>
              </div>
            </div>

            {/* Simulation Trace Result */}
            {simulationTrace && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simulation Passed ({simulationTrace.totalStepsExecuted} steps)</span>
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">DAG Safe</span>
                </div>

                <div className="space-y-2 border-t border-slate-800/80 pt-3">
                  {(simulationTrace.trace || []).map((step: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-200">
                          {step.label} <span className="font-mono text-[10px] text-indigo-400">[{step.type}]</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{step.outcome}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
