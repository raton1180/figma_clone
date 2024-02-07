import { LiveCursorProps } from '@/types/type'
import React from 'react'
import Cursor from './Cursor'
import { COLORS } from '@/constants'

const LiveCursor = ({ others }: LiveCursorProps) => {
    return others.map((other, idx) => {
        if (!other?.presence) return null

        return (
            <Cursor
                key={other?.connectionId}
                color={COLORS[Number(other?.connectionId) % COLORS.length]}
                x={other?.presence?.cursor?.x}
                y={other?.presence?.cursor?.y}
                message={other?.presence?.message}
            />
        )
    })

}

export default LiveCursor