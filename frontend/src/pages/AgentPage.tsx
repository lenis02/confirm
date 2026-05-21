import { useEffect, useRef, useState } from 'react';
import { projectsApi } from '../api/projects';
import { agentApi } from '../api/agent';
import type { Project } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

function makeWelcome(): Message {
  return {
    id: 'welcome',
    role: 'assistant',
    content: '안녕하세요! PM 에이전트입니다.\n프로젝트 관리, 일정 계획, 팀 운영, 회의 전략 등 무엇이든 상의해 주세요.\n\n프로젝트를 선택하면 해당 프로젝트 맥락에서 대화할 수 있습니다.',
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>(() => [makeWelcome()]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, time: now };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await agentApi.chat(text, selectedProjectId || undefined);
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err: any) {
      const status = err?.response?.status;
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: status === 404
          ? 'PM 에이전트 서비스가 아직 준비되지 않았습니다.\n백엔드에서 /api/agent/chat 엔드포인트를 활성화해주세요.'
          : '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">PM 에이전트</h2>
              <p className="text-xs text-gray-400">프로젝트 관리 AI 어시스턴트</p>
            </div>
          </div>

          {/* 프로젝트 컨텍스트 선택 */}
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:border-orange-400 cursor-pointer text-gray-600 max-w-48"
          >
            <option value="">프로젝트 선택 (선택사항)</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded px-2.5 py-1.5">
            <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span><strong>{selectedProject.name}</strong> 프로젝트 컨텍스트로 대화 중</span>
            <button onClick={() => setSelectedProjectId('')} className="ml-auto text-orange-400 hover:text-orange-600 cursor-pointer">×</button>
          </div>
        )}
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-gray-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* 아바타 */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${msg.role === 'assistant' ? 'bg-orange-500' : 'bg-gray-500'}`}>
              {msg.role === 'assistant' ? 'AI' : 'ME'}
            </div>

            {/* 말풍선 */}
            <div className={`flex flex-col gap-0.5 max-w-[72%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={[
                'px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
                msg.role === 'assistant'
                  ? 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm shadow-sm'
                  : 'bg-orange-500 text-white rounded-2xl rounded-tr-sm',
              ].join(' ')}>
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-400 px-1">{msg.time}</span>
            </div>
          </div>
        ))}

        {/* 로딩 인디케이터 */}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">AI</div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3.5 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="px-6 py-4 bg-white border-t border-gray-200 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            rows={2}
            className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-orange-400 bg-gray-50 placeholder-gray-400"
            placeholder="메시지를 입력하세요... (Enter: 전송 / Shift+Enter: 줄바꿈)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition disabled:opacity-40 cursor-pointer shrink-0 h-[72px] flex items-center"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
