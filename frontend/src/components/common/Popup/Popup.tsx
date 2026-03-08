import React, { useState, useEffect, useRef } from 'react'
import { CSSTransition } from 'react-transition-group'
import * as S from './Popup.styles'
import { PopupProps } from './Popup.types'
import { useOutsideClick } from '@/hooks/useOutsideClick'

const Popup: React.FC<PopupProps> = ({
    title,
    showInput = false,
    defaultValue = '',
    maxLength = 9999,
    description,
    caption,
    onCancel,
    onConfirm,
    className,
    cancelButtonText = '취소',
    confirmButtonText = '전송',
    confirmButtonVariant,
    disabled = false,
}) => {
    const [value, setValue] = useState(defaultValue)
    const [visible, setVisible] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setValue(defaultValue)
        setVisible(true)
    }, [defaultValue])

    const handleClose = () => {
        // fade-­out 효과를 위해 visible을 false로
        setVisible(false)
    }

    const onExited = () => {
        onCancel()
    }

    useOutsideClick(wrapperRef, handleClose);

    return (
        <CSSTransition
            in={visible}
            timeout={{ enter: 300, exit: 200 }}
            nodeRef={wrapperRef}
            onExited={onExited}
            unmountOnExit
        >
            {state => {
                return (
                    <S.Overlay state={state as 'entering' | 'entered' | 'exiting'}>
                        <S.PopupWrapper
                            ref={wrapperRef}
                            className={className}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <S.Content hasInput={showInput || !!description}>
                                <S.Title>{title}</S.Title>
                                {description && (
                                    <S.Description>
                                        {description}
                                    </S.Description>
                                )}
                                {showInput && (
                                    <S.InputWrapper>
                                        <S.Input
                                            value={value}
                                            onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
                                            maxLength={maxLength}
                                            placeholder="입력하세요"
                                        />
                                        <S.Count>
                                            {`${value.length}/${maxLength}`}
                                        </S.Count>
                                    </S.InputWrapper>
                                )}
                                {caption && (
                                    <S.Caption>
                                        {caption}
                                    </S.Caption>
                                )}
                            </S.Content>
                            <S.Actions>
                                <S.ButtonText variant="third" onClick={handleClose} disabled={disabled}>
                                    {cancelButtonText}
                                </S.ButtonText>
                                <S.ButtonText variant={confirmButtonVariant} onClick={() => onConfirm(showInput ? value : undefined)} disabled={disabled}>
                                    {confirmButtonText}
                                </S.ButtonText>
                            </S.Actions>
                        </S.PopupWrapper>
                    </S.Overlay>
                )
            }}

        </CSSTransition >


    )
}

export default Popup
