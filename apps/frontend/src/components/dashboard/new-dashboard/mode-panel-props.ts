import type { DashboardModeId } from './types';

export type ModePanelOnPromptSelect = (prompt: string, subType?: string | null) => void;

export type ModePanelProps = {
  /** 当前选中的 dashboard mode（部分 panel 可能用不到） */
  mode: DashboardModeId;
  /** 子类型（用于 image 的 styles 等） */
  subType: string | null;
  setSubType: (subType: string | null) => void;
  /** 由 panel 生成的参数，写入 useSunaModePersistence().initialParameters */
  setInitialParameters: (params: Record<string, any> | null) => void;
  /** 点击模板/示例 prompt 时回填到底部输入框 */
  onPromptSelect: ModePanelOnPromptSelect;
};

