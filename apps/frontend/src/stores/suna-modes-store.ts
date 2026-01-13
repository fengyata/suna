import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SunaModesState {
  selectedMode: string | null;
  selectedCharts: string[];
  selectedOutputFormat: string | null;
  selectedTemplate: string | null;
  subType: string | null;
  initialParameters: Record<string, any> | null;
  
  setSelectedMode: (mode: string | null) => void;
  setSelectedCharts: (charts: string[]) => void;
  setSelectedOutputFormat: (format: string | null) => void;
  setSelectedTemplate: (template: string | null) => void;
  setSubType: (subType: string | null) => void;
  setInitialParameters: (parameters: Record<string, any> | null) => void;
}

export const useSunaModesStore = create<SunaModesState>()(
  persist(
    (set, get) => ({
      selectedMode: null,
      selectedCharts: [],
      selectedOutputFormat: null,
      selectedTemplate: null,
      subType: null,
      initialParameters: null,
      
      setSelectedMode: (mode: string | null) => {
        set({ selectedMode: mode });
        // Reset subtype/params whenever mode changes (matches legacy behavior)
        set({ subType: null, initialParameters: null });
        
        // Reset data-specific selections when mode changes
        if (mode !== 'data') {
          set({ selectedCharts: [], selectedOutputFormat: null });
        }
        if (mode !== 'slides') {
          set({ selectedTemplate: null });
        }
      },

      setSubType: (subType: string | null) => {
        set({ subType });
      },
      
      setSelectedCharts: (charts: string[]) => {
        set({ selectedCharts: charts });
      },
      
      setSelectedOutputFormat: (format: string | null) => {
        set({ selectedOutputFormat: format });
      },
      
      setSelectedTemplate: (template: string | null) => {
        set({ selectedTemplate: template });
      },

      setInitialParameters: (parameters: Record<string, any> | null) => {
        set({ initialParameters: parameters });
      },
    }),
    {
      name: 'suna-modes-storage',
      partialize: (state) => ({
        selectedMode: state.selectedMode,
        selectedCharts: state.selectedCharts,
        selectedOutputFormat: state.selectedOutputFormat,
        selectedTemplate: state.selectedTemplate,
      }),
    }
  )
);

// Convenience hook for backward compatibility
export function useSunaModePersistence() {
  const store = useSunaModesStore();
  
  return {
    selectedMode: store.selectedMode,
    selectedCharts: store.selectedCharts,
    selectedOutputFormat: store.selectedOutputFormat,
    selectedTemplate: store.selectedTemplate,
    setSelectedMode: store.setSelectedMode,
    setSelectedCharts: store.setSelectedCharts,
    setSelectedOutputFormat: store.setSelectedOutputFormat,
    setSelectedTemplate: store.setSelectedTemplate,
    subType: store.subType,
    setSubType: store.setSubType,
    initialParameters: store.initialParameters,
    setInitialParameters: store.setInitialParameters,
  };
}

