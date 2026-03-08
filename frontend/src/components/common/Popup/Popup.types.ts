import React from 'react'

export interface PopupProps {
    /** 팝업 상단 타이틀 텍스트 */
    title: string
    /** 입력폼 표시 여부 (true면 입력폼 포함, false면 타이틀만) */
    showInput?: boolean
    /** 입력폼 기본값 (편집 대상의 현재 이름 등) */
    defaultValue?: string
    /** 입력 글자 최대 길이 (기본 9999) */
    maxLength?: number
    /** 입력폼 대신 보여줄 커스텀 콘텐츠 */
    description?: React.ReactNode
    /** 취소 버튼 클릭 시 호출 */
    onCancel: () => void
    /** 확인 버튼 클릭 시 호출, 입력폼 있을 때는 값이 전달됨 */
    onConfirm: (value?: string) => void
    /** styled-components용 클래스명 */
    className?: string
    /** 취소 버튼 텍스트 (기본: '취소') */
    cancelButtonText?: string;
    /** 확인 버튼 텍스트 (기본: '전송') */
    confirmButtonText?: string;
    /** 확인 버튼 스타일 variant (기본: point color) */
    confirmButtonVariant?: 'error';

    caption?: string;

    disabled?: boolean;
}
