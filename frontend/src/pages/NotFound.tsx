// src/pages/NotFound.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>404 Not Found</h1>
        <br />
        <p>죄송합니다. 요청하신 페이지를 찾을 수 없습니다.</p>
        <br />
        <Link to="/">홈으로 돌아가기</Link>
    </div>
);

export default NotFound;
