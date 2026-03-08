import { useEffect } from 'react'

/**
 * ref로 전달된 엘리먼트 외부를 클릭하면 callback을 호출하는 훅
 * @param ref - 외부 클릭을 감지할 DOM ref
 * @param callback - 외부 클릭 시 실행할 함수
 */
export function useOutsideClick(
    ref: React.RefObject<HTMLElement>,
    callback: () => void
) {
    useEffect(() => {
        function handleClickOrTouch(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback()
            }
        }
        document.addEventListener('mousedown', handleClickOrTouch)
        return () => {
            document.removeEventListener('mousedown', handleClickOrTouch)
        }
    }, [callback])
}
