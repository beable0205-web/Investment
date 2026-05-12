'use client';

import { useState } from 'react';
import { deletePosition } from './actions';

export default function DeleteButton({ ticker }: { ticker: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <button 
      onClick={async () => {
        if(confirm(`${ticker} 종목을 포트폴리오에서 삭제하시겠습니까?\n(해당 종목의 평가금액은 현금으로 반환됩니다)`)) {
          setIsDeleting(true);
          await deletePosition(ticker);
          setIsDeleting(false);
        }
      }}
      disabled={isDeleting}
      style={{
        background: isDeleting ? '#475569' : 'transparent',
        color: isDeleting ? '#94a3b8' : '#ef4444',
        border: '1px solid ' + (isDeleting ? '#475569' : '#ef4444'),
        padding: '0.4rem 0.8rem',
        borderRadius: '6px',
        cursor: isDeleting ? 'not-allowed' : 'pointer',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => {
        if(!isDeleting) {
          e.currentTarget.style.background = '#ef4444';
          e.currentTarget.style.color = '#fff';
        }
      }}
      onMouseOut={(e) => {
        if(!isDeleting) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#ef4444';
        }
      }}
    >
      {isDeleting ? '삭제 중...' : '삭제'}
    </button>
  )
}
