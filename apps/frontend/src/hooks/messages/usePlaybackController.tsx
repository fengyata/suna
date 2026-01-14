import { useCallback, useEffect, useReducer, useRef } from 'react';
import { UnifiedMessage } from '@/components/thread/types';
import { safeJsonParse } from '@/components/thread/utils';

export interface PlaybackState {
    isPlaying: boolean;
    currentMessageIndex: number;
    visibleMessages: UnifiedMessage[];
    streamingText: string;
    isStreamingText: boolean;
    currentToolCall: any | null;
}

type PlaybackAction =
    | { type: 'TOGGLE_PLAYBACK' }
    | { type: 'START_PLAYBACK' }
    | { type: 'RESET' }
    | { type: 'SKIP_TO_END'; messages: UnifiedMessage[] }
    | { type: 'FORWARD_ONE'; messages: UnifiedMessage[] }
    | { type: 'BACKWARD_ONE' }
    | { type: 'SET_VISIBLE_MESSAGES'; messages: UnifiedMessage[] }
    | { type: 'SET_STREAMING_TEXT'; text: string }
    | { type: 'SET_IS_STREAMING'; value: boolean }
    | { type: 'SET_CURRENT_MESSAGE_INDEX'; index: number }
    | { type: 'SET_CURRENT_TOOL_CALL'; toolCall: any | null }
    | { type: 'STOP_PLAYBACK' };

function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
    switch (action.type) {
        case 'TOGGLE_PLAYBACK':
            return { ...state, isPlaying: !state.isPlaying };
        case 'START_PLAYBACK':
            return { ...state, isPlaying: true };
        case 'RESET':
            return {
                isPlaying: false,
                currentMessageIndex: 0,
                visibleMessages: [],
                streamingText: '',
                isStreamingText: false,
                currentToolCall: null,
            };
        case 'SKIP_TO_END':
            return {
                ...state,
                isPlaying: false,
                currentMessageIndex: action.messages.length,
                visibleMessages: action.messages,
                streamingText: '',
                isStreamingText: false,
                currentToolCall: null,
            };
        case 'FORWARD_ONE': {
            const nextIndex = Math.min(state.currentMessageIndex + 1, action.messages.length);
            return {
                ...state,
                currentMessageIndex: nextIndex,
                visibleMessages: action.messages.slice(0, nextIndex),
                streamingText: '',
                isStreamingText: false,
            };
        }
        case 'BACKWARD_ONE': {
            const prevIndex = Math.max(0, state.currentMessageIndex - 1);
            return {
                ...state,
                currentMessageIndex: prevIndex,
                visibleMessages: state.visibleMessages.slice(0, prevIndex),
                streamingText: '',
                isStreamingText: false,
            };
        }
        case 'SET_VISIBLE_MESSAGES':
            return { ...state, visibleMessages: action.messages };
        case 'SET_STREAMING_TEXT':
            return { ...state, streamingText: action.text };
        case 'SET_IS_STREAMING':
            return { ...state, isStreamingText: action.value };
        case 'SET_CURRENT_MESSAGE_INDEX':
            return { ...state, currentMessageIndex: action.index };
        case 'SET_CURRENT_TOOL_CALL':
            return { ...state, currentToolCall: action.toolCall };
        case 'STOP_PLAYBACK':
            return { ...state, isPlaying: false };
        default:
            return state;
    }
}

interface UsePlaybackControllerOptions {
    messages: UnifiedMessage[];
    enabled: boolean;
    isSidePanelOpen: boolean;
    onToggleSidePanel: () => void;
    setCurrentToolIndex: (index: number) => void;
    toolCalls: any[];
}

export function usePlaybackController({
    messages,
    enabled,
    isSidePanelOpen,
    onToggleSidePanel,
    setCurrentToolIndex,
    toolCalls,
}: UsePlaybackControllerOptions) {
    const [state, dispatch] = useReducer(playbackReducer, {
        isPlaying: false,
        currentMessageIndex: 0,
        visibleMessages: messages.length > 0 ? [messages[0]] : [],
        streamingText: '',
        isStreamingText: false,
        currentToolCall: null,
    });

    // Refs to avoid stale closures
    const stateRef = useRef(state);
    const messagesRef = useRef(messages);
    const streamCleanupRef = useRef<(() => void) | null>(null);
    const playbackLoopRef = useRef<boolean>(false);

    // Keep refs in sync
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Initialize with first message when messages load
    useEffect(() => {
        if (enabled && messages.length > 0 && state.visibleMessages.length === 0) {
            dispatch({ type: 'SET_VISIBLE_MESSAGES', messages: [messages[0]] });
        }
    }, [enabled, messages, state.visibleMessages.length, dispatch]);

    // Stream text character by character with realistic typing animation.
    // Optionally accepts a "finalMessage" to persist after streaming finishes.
    const streamText = useCallback((
        text: string,
        finalMessage: UnifiedMessage | undefined,
        onComplete: () => void
    ) => {
        if (!text) {
            onComplete();
            return () => { };
        }

        // Check if playback is still active
        if (!stateRef.current.isPlaying) {
            onComplete();
            return () => { };
        }

        const textStr = typeof text === 'string' ? text : String(text);

        dispatch({ type: 'SET_IS_STREAMING', value: true });
        dispatch({ type: 'SET_STREAMING_TEXT', text: '' });

        let currentIndex = 0;
        let currentText = '';
        let isCancelled = false;

        const streamNextChar = () => {
            if (isCancelled || !stateRef.current.isPlaying) {
                dispatch({ type: 'SET_IS_STREAMING', value: false });
                onComplete();
                return;
            }

            if (currentIndex < textStr.length) {
                // Dynamically adjust typing speed for realistic effect
                // Keep this slow enough to be perceivable. Very small delays often look "instant"
                // due to browser timer clamping and React batching.
                const baseDelay = 8;
                let typingDelay = baseDelay;

                // Add more delay for punctuation to make it feel natural
                const char = textStr[currentIndex];
                if ('.!?,;:'.includes(char)) {
                    typingDelay = baseDelay + Math.random() * 30 + 50;
                } else {
                    const variableDelay = Math.random() * 8;
                    typingDelay = baseDelay + variableDelay;
                }

                // Add the next character
                currentText += char;

                dispatch({ type: 'SET_STREAMING_TEXT', text: currentText });
                currentIndex++;

                // Process next character with dynamic delay
                setTimeout(streamNextChar, typingDelay);
            } else {
                // Finished streaming - add the complete message to visibleMessages
                dispatch({ type: 'SET_IS_STREAMING', value: false });

                const currentState = stateRef.current;
                const currentMessageIndex = currentState.currentMessageIndex;
                const currentMessage = messagesRef.current[currentMessageIndex];
                const messageToPersist = finalMessage || currentMessage;
                const lastMessage = currentState.visibleMessages[currentState.visibleMessages.length - 1];

                if (lastMessage?.message_id === messageToPersist.message_id) {
                    // Replace the streaming message with the complete one
                    dispatch({
                        type: 'SET_VISIBLE_MESSAGES',
                        messages: [...currentState.visibleMessages.slice(0, -1), messageToPersist]
                    });
                } else {
                    // Add the complete message
                    dispatch({
                        type: 'SET_VISIBLE_MESSAGES',
                        messages: [...currentState.visibleMessages, messageToPersist]
                    });
                }

                dispatch({ type: 'SET_STREAMING_TEXT', text: '' });
                onComplete();
            }
        };

        streamNextChar();

        // Return cleanup function
        return () => {
            isCancelled = true;
            dispatch({ type: 'SET_IS_STREAMING', value: false });
        };
    }, []);

    const normalizeAssistantForPlayback = useCallback((message: UnifiedMessage): {
        textToStream: string;
        displayMessage: UnifiedMessage;
    } => {
        const contentStr =
            typeof message.content === 'string'
                ? message.content
                : message.content != null
                    ? JSON.stringify(message.content)
                    : '';

        const metadataStr =
            typeof message.metadata === 'string'
                ? message.metadata
                : message.metadata != null
                    ? JSON.stringify(message.metadata)
                    : '{}';

        const parsedContent = safeJsonParse<any>(contentStr, { content: contentStr });
        const parsedMetadata = safeJsonParse<any>(metadataStr, {});

        // 1) Standard text field
        const metaText = parsedMetadata?.text_content;
        const metaTextStr =
            typeof metaText === 'string' ? metaText : (metaText != null ? String(metaText) : '');

        // 2) Ask/complete tool call text (your sample: metadata.tool_calls[].arguments.text)
        const toolCalls: any[] = Array.isArray(parsedMetadata?.tool_calls) ? parsedMetadata.tool_calls : [];
        const askOrComplete = toolCalls.find((tc) => {
            const fn = String(tc?.function_name || '').replace(/_/g, '-').toLowerCase();
            return fn === 'ask' || fn === 'complete';
        });
        const toolText = askOrComplete?.arguments?.text;
        const toolTextStr =
            typeof toolText === 'string' ? toolText : (toolText != null ? String(toolText) : '');

        // 3) Legacy content JSON / raw content
        const parsedContentVal = parsedContent?.content;
        const parsedContentStr =
            typeof parsedContentVal === 'string'
                ? parsedContentVal
                : parsedContentVal != null
                    ? String(parsedContentVal)
                    : '';

        const raw = metaTextStr || toolTextStr || parsedContentStr || contentStr;
        const textToStream = typeof raw === 'string' ? raw : (raw != null ? String(raw) : '');

        // Persist: if backend stored assistant content as empty but we extracted text from metadata,
        // inject it so the final message doesn't "disappear" after streaming finishes.
        const shouldInjectText =
            (typeof message.content !== 'string' || message.content.trim().length === 0) &&
            textToStream.trim().length > 0;

        const displayMessage: UnifiedMessage = shouldInjectText
            ? {
                ...message,
                content: textToStream,
                metadata: JSON.stringify({
                    ...(typeof parsedMetadata === 'object' && parsedMetadata ? parsedMetadata : {}),
                    text_content: textToStream,
                }),
            }
            : {
                ...message,
                metadata: typeof message.metadata === 'string' ? message.metadata : JSON.stringify(parsedMetadata || {}),
            };

        return { textToStream, displayMessage };
    }, []);

    const normalizeUserForPlayback = useCallback((message: UnifiedMessage): {
        textToStream: string;
        displayMessage: UnifiedMessage;
    } => {
        // User messages may come as:
        // - string
        // - object like { role: "user", content: "..." }
        // - JSON string of either of the above
        const contentStr =
            typeof message.content === 'string'
                ? message.content
                : message.content != null
                    ? JSON.stringify(message.content)
                    : '';

        const metadataStr =
            typeof message.metadata === 'string'
                ? message.metadata
                : message.metadata != null
                    ? JSON.stringify(message.metadata)
                    : '{}';

        const parsedContent = safeJsonParse<any>(contentStr, { content: contentStr });
        const parsedMetadata = safeJsonParse<any>(metadataStr, {});

        // Prefer parsedContent.content if it's a string (covers { content: "hello" } and { role, content } forms).
        const parsedVal = parsedContent?.content;
        const parsedText =
            typeof parsedVal === 'string' ? parsedVal : (parsedVal != null ? String(parsedVal) : '');

        const raw = parsedText || contentStr;
        const textToStream = typeof raw === 'string' ? raw : (raw != null ? String(raw) : '');

        // Normalize to a plain string content for consistent rendering during playback.
        const displayMessage: UnifiedMessage = {
            ...message,
            content: textToStream,
            metadata: typeof message.metadata === 'string' ? message.metadata : JSON.stringify(parsedMetadata || {}),
        };

        return { textToStream, displayMessage };
    }, []);

    // Stream a message by progressively updating its content inside visibleMessages.
    // We intentionally DO NOT use streamingText/isStreamingText for user messages because ThreadContent
    // treats playback streamingText as assistant-only.
    const streamMessageInPlace = useCallback(async (
        message: UnifiedMessage,
        text: string,
        options?: { baseDelay?: number; punctuationExtraMin?: number; punctuationExtraMax?: number }
    ) => {
        const textStr = typeof text === 'string' ? text : String(text ?? '');

        const upsert = (msg: UnifiedMessage) => {
            const current = stateRef.current.visibleMessages;
            const idx = current.findIndex((m) => m.message_id === msg.message_id);
            const next =
                idx >= 0
                    ? [...current.slice(0, idx), msg, ...current.slice(idx + 1)]
                    : [...current, msg];
            dispatch({ type: 'SET_VISIBLE_MESSAGES', messages: next });
        };

        // Empty text: just ensure message is present
        if (!textStr || textStr.trim().length === 0) {
            upsert(message);
            return;
        }

        const {
            baseDelay = 12,
            punctuationExtraMin = 60,
            punctuationExtraMax = 110,
        } = options || {};

        let partial = '';
        for (let i = 0; i < textStr.length; i++) {
            if (!stateRef.current.isPlaying) break;

            partial += textStr[i];
            upsert({ ...message, content: partial });

            const ch = textStr[i];
            const extra =
                '.!?,;:'.includes(ch)
                    ? punctuationExtraMin + Math.random() * (punctuationExtraMax - punctuationExtraMin)
                    : Math.random() * 6;
            const delay = baseDelay + extra;
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Ensure final full message content is persisted
        upsert(message);
    }, []);

    // Main playback loop - ONLY runs when isPlaying changes
    useEffect(() => {
        if (!enabled || !state.isPlaying || messages.length === 0) {
            return;
        }

        let isCancelled = false;
        playbackLoopRef.current = true;

        const runPlayback = async () => {
            while (!isCancelled && stateRef.current.isPlaying && playbackLoopRef.current) {
                const currentState = stateRef.current;
                const msgIndex = currentState.currentMessageIndex;
                const currentMessages = messagesRef.current;

                // Check if we're done
                if (msgIndex >= currentMessages.length) {
                    dispatch({ type: 'STOP_PLAYBACK' });
                    break;
                }

                const currentMessage = currentMessages[msgIndex];

                // Skip if already visible (first message on autoplay)
                const isAlreadyVisible = currentState.visibleMessages.some(
                    (m) => m.message_id === currentMessage.message_id
                );

                // If the first message was pre-rendered, we usually skip it to avoid duplicates.
                // But for user messages we want a typing effect, so we allow streaming-in-place.
                if (isAlreadyVisible && msgIndex === 0 && currentMessage.type !== 'user') {
                    dispatch({ type: 'SET_CURRENT_MESSAGE_INDEX', index: msgIndex + 1 });
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }

                // Stream assistant messages
                if (currentMessage.type === 'assistant') {
                    try {
                        const { textToStream, displayMessage } = normalizeAssistantForPlayback(currentMessage);

                        // Stream the text
                        // IMPORTANT: If we couldn't extract any text, we must still render the message.
                        // Otherwise assistant replies with empty/unsupported text formats "disappear" in share playback.
                        if (!textToStream || textToStream.trim().length === 0) {
                            dispatch({
                                type: 'SET_VISIBLE_MESSAGES',
                                messages: [...currentState.visibleMessages, displayMessage],
                            });
                            await new Promise(resolve => setTimeout(resolve, 150));
                        } else {
                            await new Promise<void>((resolve) => {
                                const cleanup = streamText(textToStream, displayMessage, resolve);
                                streamCleanupRef.current = cleanup;
                            });
                        }

                        if (isCancelled) break;
                    } catch (error) {
                        console.error('Error streaming message:', error);
                    }
                } else if (currentMessage.type === 'user') {
                    try {
                        const { textToStream, displayMessage } = normalizeUserForPlayback(currentMessage);
                        await streamMessageInPlace(displayMessage, textToStream, {
                            baseDelay: 10,
                            punctuationExtraMin: 50,
                            punctuationExtraMax: 90,
                        });
                    } catch (error) {
                        console.error('Error streaming user message:', error);
                        // Fallback: show immediately
                        dispatch({
                            type: 'SET_VISIBLE_MESSAGES',
                            messages: [...currentState.visibleMessages, currentMessage],
                        });
                        await new Promise(resolve => setTimeout(resolve, 150));
                    }
                } else {
                    // Non-assistant messages: show immediately
                    dispatch({
                        type: 'SET_VISIBLE_MESSAGES',
                        messages: [...currentState.visibleMessages, currentMessage],
                    });

                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                if (isCancelled) break;

                // Move to next message
                dispatch({ type: 'SET_CURRENT_MESSAGE_INDEX', index: msgIndex + 1 });

                // Delay between messages
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            playbackLoopRef.current = false;
        };

        runPlayback();

        return () => {
            isCancelled = true;
            playbackLoopRef.current = false;
            if (streamCleanupRef.current) {
                streamCleanupRef.current();
                streamCleanupRef.current = null;
            }
        };
    }, [enabled, state.isPlaying, messages.length, streamText]);

    // Control functions
    const togglePlayback = useCallback(() => {
        dispatch({ type: 'TOGGLE_PLAYBACK' });
        if (!state.isPlaying && !isSidePanelOpen) {
            onToggleSidePanel();
        }
    }, [state.isPlaying, isSidePanelOpen, onToggleSidePanel]);

    const resetPlayback = useCallback(() => {
        if (streamCleanupRef.current) {
            streamCleanupRef.current();
            streamCleanupRef.current = null;
        }
        dispatch({ type: 'RESET' });
        if (isSidePanelOpen) {
            onToggleSidePanel();
        }
    }, [isSidePanelOpen, onToggleSidePanel]);

    const skipToEnd = useCallback(() => {
        if (streamCleanupRef.current) {
            streamCleanupRef.current();
            streamCleanupRef.current = null;
        }
        dispatch({ type: 'SKIP_TO_END', messages });
        if (toolCalls.length > 0 && !isSidePanelOpen) {
            setCurrentToolIndex(toolCalls.length - 1);
            onToggleSidePanel();
        }
    }, [messages, toolCalls, isSidePanelOpen, setCurrentToolIndex, onToggleSidePanel]);

    const forwardOne = useCallback(() => {
        if (streamCleanupRef.current) {
            streamCleanupRef.current();
            streamCleanupRef.current = null;
        }
        dispatch({ type: 'FORWARD_ONE', messages });
    }, [messages]);

    const backwardOne = useCallback(() => {
        if (streamCleanupRef.current) {
            streamCleanupRef.current();
            streamCleanupRef.current = null;
        }
        dispatch({ type: 'BACKWARD_ONE' });
    }, []);

    // Auto-start playback after a delay when first loaded
    useEffect(() => {
        if (enabled && messages.length > 0 && state.currentMessageIndex === 0 && !state.isPlaying) {
            const autoStartTimer = setTimeout(() => {
                dispatch({ type: 'START_PLAYBACK' });
                if (!isSidePanelOpen) {
                    onToggleSidePanel();
                }
            }, 500);

            return () => clearTimeout(autoStartTimer);
        }
    }, [enabled, messages.length, state.currentMessageIndex, state.isPlaying, isSidePanelOpen, onToggleSidePanel]);

    return {
        playbackState: {
            ...state,
            displayMessages: state.isStreamingText
                ? state.visibleMessages
                : state.visibleMessages,
        },
        togglePlayback,
        resetPlayback,
        skipToEnd,
        forwardOne,
        backwardOne,
    };
}

