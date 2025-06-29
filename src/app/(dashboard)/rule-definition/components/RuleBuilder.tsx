'use client';

import { useState, useEffect } from 'react';
import { Rule, RuleType } from '@/types/rule';

export default function RuleBuilder({ onAddRule }: { 
  onAddRule: (rule: Rule) => void 
}) {
  const [ruleType, setRuleType] = useState<RuleType>('coRun');
  const [coRunTasks, setCoRunTasks] = useState<string[]>([]);
  const [slotGroup, setSlotGroup] = useState('');
  const [minSlots, setMinSlots] = useState(1);
  const [loadGroup, setLoadGroup] = useState('');
  const [maxLoad, setMaxLoad] = useState(1);
  const [phaseTask, setPhaseTask] = useState('');
  const [phases, setPhases] = useState<number[]>([]);
  const [regex, setRegex] = useState('');
  const [precedenceRules, setPrecedenceRules] = useState<string[]>([]);
  const [priority, setPriority] = useState(1);
  const [description, setDescription] = useState('');
  const [taskOptions, setTaskOptions] = useState<string[]>([]);
  const [groupOptions, setGroupOptions] = useState<string[]>([]);
  const [workerGroupOptions, setWorkerGroupOptions] = useState<string[]>([]);
  const [ruleOptions, setRuleOptions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        // Load tasks
        const tasksData = localStorage.getItem('tasks');
        if (tasksData) {
          const tasks: any[] = JSON.parse(tasksData);
          const taskIds = tasks
            .map(t => t.TaskID?.toString?.() || '')
            .filter((id): id is string => id !== '');
          setTaskOptions([...new Set(taskIds)]);
        }
        
        // Load groups from clients
        const clientsData = localStorage.getItem('clients');
        if (clientsData) {
          const clients: any[] = JSON.parse(clientsData);
          const clientGroups = clients
            .map(c => c.GroupTag?.toString?.() || '')
            .filter((group): group is string => group !== '');
          setGroupOptions([...new Set(clientGroups)]);
        }
        
        // Load worker groups
        const workersData = localStorage.getItem('workers');
        if (workersData) {
          const workers: any[] = JSON.parse(workersData);
          const workerGroups = workers
            .map(w => w.WorkerGroup?.toString?.() || '')
            .filter((group): group is string => group !== '');
          setWorkerGroupOptions([...new Set(workerGroups)]);
        }
        
        // Load existing rules for precedence
        const rulesData = localStorage.getItem('rules');
        if (rulesData) {
          const rules: any[] = JSON.parse(rulesData);
          const ruleIds = rules
            .map(r => r.id?.toString?.() || '')
            .filter((id): id is string => id !== '');
          setRuleOptions([...new Set(ruleIds)]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  const validateRule = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    switch (ruleType) {
      case 'coRun':
        if (coRunTasks.length < 2) {
          newErrors.coRunTasks = 'Select at least 2 tasks';
        }
        break;
      case 'slotRestriction':
        if (!slotGroup) {
          newErrors.slotGroup = 'Select a group';
        }
        if (minSlots < 1) {
          newErrors.minSlots = 'Minimum slots must be at least 1';
        }
        break;
      case 'loadLimit':
        if (!loadGroup) {
          newErrors.loadGroup = 'Select a worker group';
        }
        if (maxLoad < 1) {
          newErrors.maxLoad = 'Max load must be at least 1';
        }
        break;
      case 'phaseWindow':
        if (!phaseTask) {
          newErrors.phaseTask = 'Select a task';
        }
        if (phases.length === 0) {
          newErrors.phases = 'Select at least one phase';
        }
        break;
      case 'patternMatch':
        if (!regex.trim()) {
          newErrors.regex = 'Regex pattern is required';
        }
        break;
      case 'precedenceOverride':
        if (precedenceRules.length === 0) {
          newErrors.precedenceRules = 'Select at least one rule';
        }
        if (priority < 1 || priority > 10) {
          newErrors.priority = 'Priority must be between 1-10';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddRule = () => {
    if (!validateRule()) return;

    const baseRule = {
      id: `${ruleType}-${Date.now()}`,
      type: ruleType,
      description: description.trim()
    };

    switch (ruleType) {
      case 'coRun':
        onAddRule({
          ...baseRule,
          taskIds: coRunTasks
        } as any);
        setCoRunTasks([]);
        break;
      case 'slotRestriction':
        onAddRule({
          ...baseRule,
          group: slotGroup,
          minCommonSlots: minSlots
        } as any);
        setSlotGroup('');
        setMinSlots(1);
        break;
      case 'loadLimit':
        onAddRule({
          ...baseRule,
          workerGroup: loadGroup,
          maxSlotsPerPhase: maxLoad
        } as any);
        setLoadGroup('');
        setMaxLoad(1);
        break;
      case 'phaseWindow':
        onAddRule({
          ...baseRule,
          taskId: phaseTask,
          allowedPhases: phases
        } as any);
        setPhaseTask('');
        setPhases([]);
        break;
      case 'patternMatch':
        onAddRule({
          ...baseRule,
          regex,
          ruleTemplate: 'custom',
          parameters: {}
        } as any);
        setRegex('');
        break;
      case 'precedenceOverride':
        onAddRule({
          ...baseRule,
          ruleIds: precedenceRules,
          priority
        } as any);
        setPrecedenceRules([]);
        setPriority(1);
        break;
    }

    // Reset form
    setDescription('');
    setErrors({});
  };

  return (
    <div className="border rounded-lg p-4 mb-6 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Build Rule</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block mb-1 text-sm font-medium">Rule Type</label>
          <select 
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as RuleType)}
            className="w-full p-2 border rounded text-sm"
          >
            <option value="coRun">Co-run Tasks</option>
            <option value="slotRestriction">Slot Restriction</option>
            <option value="loadLimit">Load Limit</option>
            <option value="phaseWindow">Phase Window</option>
            <option value="patternMatch">Pattern Match</option>
            <option value="precedenceOverride">Precedence Override</option>
          </select>
        </div>
        
        <div>
          <label className="block mb-1 text-sm font-medium">
            Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full p-2 border rounded text-sm ${errors.description ? 'border-red-500' : ''}`}
            placeholder="Describe this rule..."
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
          )}
        </div>
      </div>

      {ruleType === 'coRun' && (
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">
            Task IDs <span className="text-red-500">*</span>
            <span className="text-gray-500 ml-1">(Select at least 2)</span>
          </label>
          <select
            multiple
            value={coRunTasks}
            onChange={(e) => setCoRunTasks(
              Array.from(e.target.selectedOptions, option => option.value)
            )}
            className={`w-full p-2 border rounded text-sm min-h-32 ${errors.coRunTasks ? 'border-red-500' : ''}`}
          >
            {taskOptions.map(taskId => (
              <option key={taskId} value={taskId}>{taskId}</option>
            ))}
          </select>
          {errors.coRunTasks && (
            <p className="text-red-500 text-xs mt-1">{errors.coRunTasks}</p>
          )}
        </div>
      )}

      {ruleType === 'slotRestriction' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Group Tag <span className="text-red-500">*</span>
            </label>
            <select
              value={slotGroup}
              onChange={(e) => setSlotGroup(e.target.value)}
              className={`w-full p-2 border rounded text-sm ${errors.slotGroup ? 'border-red-500' : ''}`}
            >
              <option value="">Select a group</option>
              {groupOptions.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            {errors.slotGroup && (
              <p className="text-red-500 text-xs mt-1">{errors.slotGroup}</p>
            )}
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">
              Minimum Common Slots <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={minSlots}
              onChange={(e) => setMinSlots(Number(e.target.value))}
              className={`w-full p-2 border rounded text-sm ${errors.minSlots ? 'border-red-500' : ''}`}
              min="1"
            />
            {errors.minSlots && (
              <p className="text-red-500 text-xs mt-1">{errors.minSlots}</p>
            )}
          </div>
        </div>
      )}

      {ruleType === 'loadLimit' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Worker Group <span className="text-red-500">*</span>
            </label>
            <select
              value={loadGroup}
              onChange={(e) => setLoadGroup(e.target.value)}
              className={`w-full p-2 border rounded text-sm ${errors.loadGroup ? 'border-red-500' : ''}`}
            >
              <option value="">Select a group</option>
              {workerGroupOptions.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            {errors.loadGroup && (
              <p className="text-red-500 text-xs mt-1">{errors.loadGroup}</p>
            )}
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">
              Max Slots Per Phase <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={maxLoad}
              onChange={(e) => setMaxLoad(Number(e.target.value))}
              className={`w-full p-2 border rounded text-sm ${errors.maxLoad ? 'border-red-500' : ''}`}
              min="1"
            />
            {errors.maxLoad && (
              <p className="text-red-500 text-xs mt-1">{errors.maxLoad}</p>
            )}
          </div>
        </div>
      )}

      {ruleType === 'phaseWindow' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Task ID <span className="text-red-500">*</span>
            </label>
            <select
              value={phaseTask}
              onChange={(e) => setPhaseTask(e.target.value)}
              className={`w-full p-2 border rounded text-sm ${errors.phaseTask ? 'border-red-500' : ''}`}
            >
              <option value="">Select a task</option>
              {taskOptions.map(taskId => (
                <option key={taskId} value={taskId}>{taskId}</option>
              ))}
            </select>
            {errors.phaseTask && (
              <p className="text-red-500 text-xs mt-1">{errors.phaseTask}</p>
            )}
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">
              Allowed Phases <span className="text-red-500">*</span>
              <span className="text-gray-500 ml-1">(Comma separated)</span>
            </label>
            <input
              type="text"
              value={phases.join(',')}
              onChange={(e) => setPhases(
                e.target.value.split(',').filter(Boolean).map(Number)
              )}
              className={`w-full p-2 border rounded text-sm ${errors.phases ? 'border-red-500' : ''}`}
              placeholder="1,2,3"
            />
            {errors.phases && (
              <p className="text-red-500 text-xs mt-1">{errors.phases}</p>
            )}
          </div>
        </div>
      )}

      {ruleType === 'patternMatch' && (
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">
            Regex Pattern <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={regex}
            onChange={(e) => setRegex(e.target.value)}
            className={`w-full p-2 border rounded text-sm ${errors.regex ? 'border-red-500' : ''}`}
            placeholder="^T\d+_URGENT$"
          />
          {errors.regex && (
            <p className="text-red-500 text-xs mt-1">{errors.regex}</p>
          )}
        </div>
      )}

      {ruleType === 'precedenceOverride' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Rule IDs <span className="text-red-500">*</span>
              <span className="text-gray-500 ml-1">(Select rules to prioritize)</span>
            </label>
            <select
              multiple
              value={precedenceRules}
              onChange={(e) => setPrecedenceRules(
                Array.from(e.target.selectedOptions, option => option.value)
              )}
              className={`w-full p-2 border rounded text-sm min-h-32 ${errors.precedenceRules ? 'border-red-500' : ''}`}
            >
              {ruleOptions.map(ruleId => (
                <option key={ruleId} value={ruleId}>{ruleId}</option>
              ))}
            </select>
            {errors.precedenceRules && (
              <p className="text-red-500 text-xs mt-1">{errors.precedenceRules}</p>
            )}
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">
              Priority Level <span className="text-red-500">*</span>
              <span className="text-gray-500 ml-1">(1-10, higher = more important)</span>
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={`w-full p-2 border rounded text-sm ${errors.priority ? 'border-red-500' : ''}`}
              min="1"
              max="10"
            />
            {errors.priority && (
              <p className="text-red-500 text-xs mt-1">{errors.priority}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleAddRule}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          Add Rule
        </button>
      </div>
    </div>
  );
}


