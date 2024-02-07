import React, { useMemo } from "react";
import { useRouter } from "next/router";
import styles from "./index.module.css";
import { useOthers, useSelf } from "@/liveblocks.config";
import { generateRandomName } from "@/lib/utils";
import Avatar from "./Avatar";

const ActiveUSers = () => {
  const currentUser = useSelf();
  const others = useOthers();

  const memorizedUsers = useMemo(() => {
    const hasMoreUsers = others.length > 2;

    return (
      <div className='flex items-center justify-center gap-1'>
        {currentUser && (
          <Avatar name='You' otherStyles='border-[3px] border-primary-green' />
        )}

        {others.slice(0, 2).map(({ connectionId }) => (
          <Avatar
            key={connectionId}
            name={generateRandomName()}
            otherStyles='-ml-3'
          />
        ))}

        {hasMoreUsers && (
          <div className='z-10 -ml-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary-black'>
            +{others.length - 2}
          </div>
        )}
      </div>
    );
  }, [others, currentUser]);

  return memorizedUsers
}

export default ActiveUSers