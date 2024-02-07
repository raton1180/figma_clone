import React, { useCallback, useEffect, useState } from 'react'
import LiveCursor from './cursor/LiveCursor'
import { useBroadcastEvent, useEventListener, useMyPresence, useOthers } from '@/liveblocks.config'
import { CursorMode, CursorState, Reaction, ReactionEvent } from '@/types/type'
import CursorChat from './cursor/CursorChat'
import ReactionSelector from './reaction/ReactionButton'
import FlyingReaction from './reaction/FlyingReaction'
import useInterval from '@/hooks/useInterval';
import { Comments } from './comments/Comments';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { shortcuts } from '@/constants'

type Props = {
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>
    undo: () => void;
    redo: () => void;
}

const Live = ({ canvasRef, undo, redo }: Props) => {
    const others = useOthers()
    const [{ cursor }, updateMyPresence] = useMyPresence() as any;
    // track the state of the cursor (hidden, chat, reaction, reaction selector)
    const [cursorState, setCursorState] = useState<CursorState>({
        mode: CursorMode.Hidden,
    });

    const [reactions, setReactions] = useState<Reaction[]>([])

    // Listen to mouse events to change the cursor state
    const handlePointerMove = useCallback((event: React.PointerEvent) => {
        event.preventDefault();

        // if cursor is not in reaction selector mode, update the cursor position
        if (cursor == null || cursorState.mode !== CursorMode.ReactionSelector) {
            // get the cursor position in the canvas
            const x = event.clientX - event.currentTarget.getBoundingClientRect().x;
            const y = event.clientY - event.currentTarget.getBoundingClientRect().y;

            // broadcast the cursor position to other users
            updateMyPresence({
                cursor: {
                    x,
                    y,
                },
            });
        }
    }, [cursor, cursorState.mode, updateMyPresence]);

    // Hide the cursor when the mouse leaves the canvas
    const handlePointerLeave = useCallback(() => {
        setCursorState({
            mode: CursorMode.Hidden,
        });
        updateMyPresence({
            cursor: null,
            message: null,
        });
    }, [updateMyPresence])

    // Show the cursor when the mouse enters the canvas
    const handlePointerDown = useCallback(
        (event: React.PointerEvent) => {
            // get the cursor position in the canvas
            const x = event.clientX - event.currentTarget.getBoundingClientRect().x;
            const y = event.clientY - event.currentTarget.getBoundingClientRect().y;

            updateMyPresence({
                cursor: {
                    x,
                    y,
                },
            });

            // if cursor is in reaction mode, set isPressed to true
            setCursorState((state: CursorState) =>
                cursorState.mode === CursorMode.Reaction ? { ...state, isPressed: true } : state
            );
        },
        [cursorState.mode, setCursorState, updateMyPresence]
    );

    const handlePointerUp = useCallback((event: React.PointerEvent) => {
        setCursorState((state: CursorState) =>
            cursorState.mode === CursorMode.Reaction ? { ...state, isPressed: true } : state
        );
    }, [cursorState.mode, setCursorState]);

    useEffect(() => {
        const onKeyUp = (event: KeyboardEvent) => {
            if (event.key === '/') {
                setCursorState({
                    mode: CursorMode.Chat,
                    previousMessage: null,
                    message: ''
                })
            } else if (event.key === 'Escape') {
                updateMyPresence({ message: '' })
                setCursorState({
                    mode: CursorMode.Hidden,
                })
            } else if (event.key === 'e') {
                setCursorState({
                    mode: CursorMode.ReactionSelector,
                })
            }
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === '/') {
                event.preventDefault()
                setCursorState({
                    mode: CursorMode.Chat,
                    previousMessage: null,
                    message: ''
                })
            }
        }

        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)

        return () => {
            window.addEventListener('keydown', onKeyDown)
            window.addEventListener('keyup', onKeyUp)
        }
    }, [updateMyPresence])

    const setReaction = useCallback((reaction: string) => {
        setCursorState({ mode: CursorMode.Reaction, reaction, isPressed: false });
    }, [setCursorState]);

    useInterval(() => {
        if (cursorState.mode === CursorMode.Reaction && cursorState.isPressed && cursor) {
            setReactions(reactions => reactions.concat([
                {
                    point: { x: cursor.x, y: cursor.y },
                    value: cursorState.reaction,
                    timestamp: Date.now()
                }
            ]))
            broadcast({
                x: cursor.x,
                y: cursor.y,
                value: cursorState.reaction
            })
        }
    }, 100)

    const broadcast = useBroadcastEvent()

    useEventListener((eventData) => {
        const event = eventData?.event as ReactionEvent;

        setReactions(reactions => reactions.concat([
            {
                point: { x: event.x, y: event.y },
                value: event.value,
                timestamp: Date.now()
            }
        ]))
    })

    useInterval(() => {
        setReactions(reactions => reactions?.filter((r) => r.timestamp > Date.now() - 4000))
    }, 1000)

    const handleContextMenu = useCallback(
        (key: string) => {
            switch (key) {
                case 'Chat':
                    setCursorState({
                        mode: CursorMode.Chat,
                        previousMessage: null,
                        message: ''
                    })
                    break;
                case 'Reactions':
                    setCursorState({
                        mode: CursorMode.ReactionSelector,
                    })
                    break;
                case 'Undo':
                    undo();
                case 'Redo':
                    redo();
                    break;

                default:
                    break;
            }
        },
        [redo, undo],
    )



    return (
        <ContextMenu>

            <ContextMenuTrigger
                id='canvas'
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                className="h-full w-full flex flex-1 justify-center items-center relative "
            >
                <canvas ref={canvasRef} />

                {reactions.map(r => (
                    <FlyingReaction
                        key={r.timestamp.toString()}
                        x={r.point.x}
                        y={r.point.y}
                        timestamp={r.timestamp}
                        value={r.value}
                    />
                ))}

                {cursor && (
                    <CursorChat
                        cursor={cursor}
                        cursorState={cursorState}
                        updateMyPresence={updateMyPresence}
                        setCursorState={setCursorState}
                    />
                )}

                {cursorState.mode === CursorMode.ReactionSelector && (
                    <ReactionSelector
                        setReaction={setReaction}
                    />
                )}
                <LiveCursor others={others} />

                <Comments />
            </ContextMenuTrigger>
            <ContextMenuContent>
                {shortcuts?.map((item) => (
                    <ContextMenuItem key={item.key} className='text-white right-menu-item' onClick={() => handleContextMenu(item?.name)}>
                        <p>{item?.name}</p>
                        <p className='text-xs text-primary-grey-300'>{item?.shortcut}</p>
                    </ContextMenuItem>
                ))}
            </ContextMenuContent>
        </ContextMenu>
    )
}

export default Live