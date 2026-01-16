from core.agentscope_core.model_factory import normalize_model_name_for_agentscope


def test_normalize_model_name_for_agentscope_kortix_basic_to_claude_haiku():
    assert normalize_model_name_for_agentscope("kortix/basic") == "claude-haiku-4-5"


def test_normalize_model_name_for_agentscope_kortix_power_to_claude_sonnet():
    assert normalize_model_name_for_agentscope("kortix/power") == "claude-sonnet-4-5"


def test_normalize_model_name_for_agentscope_kortix_advanced_to_claude_sonnet():
    assert normalize_model_name_for_agentscope("kortix/advanced") == "claude-sonnet-4-5"


def test_normalize_model_name_for_agentscope_keeps_other_models_unchanged():
    assert normalize_model_name_for_agentscope("claude-sonnet-4-5") == "claude-sonnet-4-5"
    assert normalize_model_name_for_agentscope("gpt-4o") == "gpt-4o"

