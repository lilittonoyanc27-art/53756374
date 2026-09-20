import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FUTURO_QUESTIONS, FuturoQuestionItem } from './futuroQuestions.ts';
import { soundFx } from './audio.ts';
import {
  Volume2,
  VolumeX,
  Volume1,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  BookOpen,
  Award,
  Flame,
  ChevronRight,
  Lock,
  Unlock,
  Check,
} from 'lucide-react';

interface FuturoGameProps {
  onSwitchToGame1: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export function FuturoGame({ onSwitchToGame1, isMuted, toggleMute }: FuturoGameProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [statuses, setStatuses] = useState<Record<number, 'correct' | 'wrong' | 'passed'>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [showArmenian, setShowArmenian] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showCollectionModal, setShowCollectionModal] = useState<boolean>(false);

  // Translation toggles for tongue twisters (id -> boolean)
  const [trabalenguaArmenianOpen, setTrabalenguaArmenianOpen] = useState<Record<number, boolean>>({});

  const [justAnswered, setJustAnswered] = useState<{
    isCorrect: boolean;
    chosen: 'A' | 'B' | 'C' | 'D';
    correct: 'A' | 'B' | 'C' | 'D';
    explanation: string;
    trabalengua: { id: number; spanish: string; armenian: string };
  } | null>(null);

  const currentQuestion: FuturoQuestionItem = FUTURO_QUESTIONS[currentIndex];

  // Stats
  const correctCount = useMemo(() => {
    return Object.values(statuses).filter((s) => s === 'correct').length;
  }, [statuses]);

  const wrongCount = useMemo(() => {
    return Object.values(statuses).filter((s) => s === 'wrong').length;
  }, [statuses]);

  const answeredCount = correctCount + wrongCount;
  const isGameOver = answeredCount === FUTURO_QUESTIONS.length;

  // Unlocked tongue twisters set
  const unlockedTrabalenguas = useMemo(() => {
    const ids = new Set<number>();
    FUTURO_QUESTIONS.forEach((q, idx) => {
      if (statuses[idx] === 'correct') {
        ids.add(q.trabalengua.id);
      }
    });
    return ids;
  }, [statuses]);

  // Speech synthesis
  const speakSpanish = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace('______', '...').replace('___', '...'));
      utterance.lang = 'es-ES';
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  // Find next available question
  const getNextIndex = useCallback(
    (fromIdx: number, currentStat: Record<number, 'correct' | 'wrong' | 'passed'>): number => {
      for (let i = 1; i <= FUTURO_QUESTIONS.length; i++) {
        const next = (fromIdx + i) % FUTURO_QUESTIONS.length;
        const s = currentStat[next];
        if (s !== 'correct' && s !== 'wrong') {
          return next;
        }
      }
      return fromIdx;
    },
    []
  );

  // Advance to next question
  const handleNext = useCallback(() => {
    const nextIdx = getNextIndex(currentIndex, statuses);
    const newAnsweredCount = Object.values(statuses).filter(
      (s) => s === 'correct' || s === 'wrong'
    ).length;

    if (newAnsweredCount === FUTURO_QUESTIONS.length) {
      soundFx.playVictory();
      setShowSummaryModal(true);
    } else {
      setCurrentIndex(nextIdx);
      setShowArmenian(false);
      setJustAnswered(null);
    }
  }, [currentIndex, statuses, getNextIndex]);

  // Pass / Skip question
  const handlePass = () => {
    if (justAnswered) {
      handleNext();
      return;
    }
    soundFx.playPass();

    const currentStat = statuses[currentIndex];
    let newStatuses = statuses;
    if (currentStat !== 'correct' && currentStat !== 'wrong') {
      newStatuses = {
        ...statuses,
        [currentIndex]: 'passed',
      };
      setStatuses(newStatuses);
    }

    const nextIdx = getNextIndex(currentIndex, newStatuses);
    setCurrentIndex(nextIdx);
    setShowArmenian(false);
    setJustAnswered(null);
  };

  // Answer handler
  const handleChooseAnswer = (choice: 'A' | 'B' | 'C' | 'D') => {
    if (justAnswered) return;
    if (statuses[currentIndex] === 'correct' || statuses[currentIndex] === 'wrong') return;

    const isCorrect = choice === currentQuestion.correctAnswer;
    const newStatuses = {
      ...statuses,
      [currentIndex]: (isCorrect ? 'correct' : 'wrong') as 'correct' | 'wrong',
    };
    const newAnswers = {
      ...userAnswers,
      [currentIndex]: choice,
    };

    setStatuses(newStatuses);
    setUserAnswers(newAnswers);

    if (isCorrect) {
      soundFx.playCorrect();
    } else {
      soundFx.playWrong();
    }

    setJustAnswered({
      isCorrect,
      chosen: choice,
      correct: currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      trabalengua: currentQuestion.trabalengua,
    });
  };

  // Restart
  const handleRestart = () => {
    setStatuses({});
    setUserAnswers({});
    setCurrentIndex(0);
    setShowArmenian(false);
    setJustAnswered(null);
    setShowSummaryModal(false);
    setTrabalenguaArmenianOpen({});
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSummaryModal || showCollectionModal) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (justAnswered) {
          handleNext();
        } else {
          handlePass();
        }
      } else if (e.key === 't' || e.key === 'T') {
        setShowArmenian((prev) => !prev);
      } else if (!justAnswered) {
        const keyUpper = e.key.toUpperCase();
        if (keyUpper === 'A' || keyUpper === 'B' || keyUpper === 'C' || keyUpper === 'D') {
          handleChooseAnswer(keyUpper as 'A' | 'B' | 'C' | 'D');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [justAnswered, showSummaryModal, showCollectionModal, handleNext]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Game 2 Subheader / Controls */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 sm:px-6 backdrop-blur">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onSwitchToGame1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition flex items-center gap-1.5"
            >
              <span>← Խաղ 1: Պասապալաբրա</span>
            </button>

            <div className="h-4 w-px bg-slate-700" />

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/40 text-sky-300 text-xs font-semibold">
                Խաղ 2
              </span>
              <h2 className="text-sm font-semibold text-white">
                Futuro Simple + Շուտասելուկներ (20 հարց)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unlocked Trabalenguas Collection Button */}
            <button
              onClick={() => setShowCollectionModal(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
              title="Տեսնել բացված բոլոր շուտասելուկները"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Շուտասելուկներ՝</span>
              <span className="font-bold text-amber-200">
                {unlockedTrabalenguas.size} / 20
              </span>
            </button>

            <button
              onClick={handleRestart}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Սկսել նորից"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title={isMuted ? 'Ձայնը միացնել' : 'Ձայնը անջատել'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between">
        <div>
          {/* Question Navigator Bar (51 to 70) */}
          <div className="mb-5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span className="flex items-center gap-1.5">
                <span>Հարցերի ցանկ՝</span>
                <span className="text-slate-300 font-semibold">
                  {currentIndex + 1} / {FUTURO_QUESTIONS.length}
                </span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {correctCount} ճիշտ
                </span>
                <span className="text-rose-400 flex items-center gap-1 font-semibold">
                  <XCircle className="w-3.5 h-3.5" /> {wrongCount} սխալ
                </span>
              </div>
            </div>

            {/* Grid of question numbers */}
            <div className="grid grid-cols-10 sm:grid-cols-20 gap-1.5">
              {FUTURO_QUESTIONS.map((q, idx) => {
                const stat = statuses[idx];
                const isCur = idx === currentIndex;
                let bgStyle = 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-500';

                if (stat === 'correct') {
                  bgStyle = 'bg-emerald-600 border-emerald-400 text-white font-bold shadow-sm shadow-emerald-900';
                } else if (stat === 'wrong') {
                  bgStyle = 'bg-rose-600 border-rose-400 text-white font-bold shadow-sm shadow-rose-900';
                } else if (stat === 'passed') {
                  bgStyle = 'bg-amber-600/80 border-amber-400 text-white';
                } else if (isCur) {
                  bgStyle = 'bg-sky-600 border-sky-300 text-white ring-2 ring-sky-400/50';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowArmenian(false);
                      setJustAnswered(null);
                    }}
                    className={`h-8 rounded-lg text-xs font-medium border flex items-center justify-center transition-all ${bgStyle} ${
                      isCur ? 'scale-105 z-10' : ''
                    }`}
                    title={`Հարց #${q.id}`}
                  >
                    {q.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Question Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative backdrop-blur-sm">
            {/* Header with tense hint right under title (as user specifically requested) */}
            <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-800/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-500/40 text-sky-400 text-xs font-mono font-bold">
                    #{currentQuestion.id}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Հարց #{currentQuestion.id} — Futuro Simple
                  </h3>
                </div>
                {/* MANDATORY USER REQUIREMENT:
                    "под Հարց #1 — Տառ «A» подсказка но очень маленткими уквами" */}
                <p className="text-[10px] text-slate-400 font-mono lowercase tracking-normal mt-0.5 flex items-center gap-1">
                  <span className="text-slate-500">подсказка:</span>
                  <span className="text-sky-300 font-medium">
                    {currentQuestion.tenseName.toLowerCase()}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => speakSpanish(currentQuestion.spanishSentence)}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                  title="Լսել իսպաներեն արտասանությունը"
                >
                  <Volume1 className="w-4 h-4 text-sky-400" />
                </button>
              </div>
            </div>

            {/* Spanish Sentence (Click to reveal Armenian translation) */}
            <div className="mb-5">
              <div
                onClick={() => setShowArmenian((prev) => !prev)}
                className="group cursor-pointer p-4 rounded-xl bg-slate-950/80 border border-sky-900/40 hover:border-sky-500/60 transition-all duration-200 shadow-md relative"
                title="Սեղմիր՝ հայերեն թարգմանությունը տեսնելու համար"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
                      <span>🇪🇸 Իսպաներեն նախադասություն</span>
                      <span className="text-[10px] text-slate-500 group-hover:text-sky-300 transition">
                        (👆 սեղմիր թարգմանության համար)
                      </span>
                    </div>

                    <p className="text-lg sm:text-xl font-medium text-white tracking-wide leading-relaxed">
                      {currentQuestion.spanishSentence}
                    </p>
                  </div>

                  <div className="pt-1 text-slate-400 group-hover:text-amber-400 transition">
                    {showArmenian ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </div>
                </div>

                {/* Hint Bar Under Sentence */}
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-amber-300/90 font-medium">
                    {showArmenian ? '🇦🇲 Հայերեն թարգմանությունը բացված է' : '👆 Կտտացրու նախադասությանը՝ թարգմանությունը տեսնելու համար'}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    (կամ սեղմիր T)
                  </span>
                </div>
              </div>

              {/* Revealed Armenian Translation */}
              {showArmenian && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-base font-normal animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                    <span>🇦🇲 Հայերեն թարգմանություն՝</span>
                  </div>
                  <p className="font-serif leading-relaxed text-amber-100">
                    {currentQuestion.armenianTranslation}
                  </p>
                </div>
              )}
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {currentQuestion.options.map((opt) => {
                const isSelected = userAnswers[currentIndex] === opt.key;
                const isCorrectOption = opt.key === currentQuestion.correctAnswer;
                let btnStyle =
                  'bg-slate-800/90 hover:bg-slate-750 text-slate-100 border-slate-700 hover:border-slate-500';

                if (justAnswered) {
                  if (isCorrectOption) {
                    btnStyle =
                      'bg-emerald-900/80 text-emerald-100 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950';
                  } else if (isSelected && !isCorrectOption) {
                    btnStyle =
                      'bg-rose-900/80 text-rose-100 border-rose-500 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950';
                  } else {
                    btnStyle = 'bg-slate-900/50 text-slate-500 border-slate-800 opacity-60';
                  }
                }

                return (
                  <button
                    key={opt.key}
                    disabled={!!justAnswered}
                    onClick={() => handleChooseAnswer(opt.key)}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all duration-150 group font-medium ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center font-bold text-sm text-sky-400 group-hover:text-amber-300">
                        {opt.key}
                      </span>
                      <span className="text-base font-medium">{opt.text}</span>
                    </div>

                    {justAnswered && isCorrectOption && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {justAnswered && isSelected && !isCorrectOption && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* MANDATORY USER REQUIREMENT:
                "при каждом верном ответе открывается скорговорка и пусть при клике на исп откроется еевод на арм" */}
            {justAnswered && (
              <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                {justAnswered.isCorrect ? (
                  /* UNLOCKED TONGUE TWISTER REWARD CARD */
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-amber-950/40 border-2 border-amber-500/60 shadow-xl text-amber-100">
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-amber-500/30">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                        <span className="text-xs sm:text-sm font-bold text-yellow-300 uppercase tracking-wider">
                          🎉 Ճիշտ է! Բացվեց նոր շուտասելուկ #{justAnswered.trabalengua.id} (Скороговорка)
                        </span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                        Trabalenguas
                      </span>
                    </div>

                    {/* Spanish Tongue Twister: Clickable to reveal Armenian translation */}
                    <div
                      onClick={() =>
                        setTrabalenguaArmenianOpen((prev) => ({
                          ...prev,
                          [justAnswered.trabalengua.id]: !prev[justAnswered.trabalengua.id],
                        }))
                      }
                      className="cursor-pointer group p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/40 hover:border-yellow-400 transition-all shadow-inner"
                      title="Կտտացրու շուտասելուկի վրա՝ հայերեն թարգմանությունը տեսնելու համար"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-[11px] text-amber-400/90 font-semibold mb-1 flex items-center gap-1.5">
                            <span>🇪🇸 Շուտասելուկ իսպաներենով</span>
                            <span className="text-[10px] text-slate-400 group-hover:text-yellow-300 transition">
                              (👆 սեղմիր թարգմանության համար)
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-semibold text-yellow-100 leading-snug">
                            {justAnswered.trabalengua.spanish}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakSpanish(justAnswered.trabalengua.spanish);
                            }}
                            className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition"
                            title="Լսել շուտասելուկի արտասանությունը"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Click to reveal Armenian Translation */}
                      {trabalenguaArmenianOpen[justAnswered.trabalengua.id] ? (
                        <div className="mt-2.5 pt-2.5 border-t border-amber-500/30 text-sm text-amber-200 font-serif">
                          <div className="text-[11px] font-semibold text-amber-400 mb-0.5">
                            🇦🇲 Հայերեն թարգմանություն՝
                          </div>
                          <p className="text-white font-medium">
                            {justAnswered.trabalengua.armenian}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-1.5 text-[11px] text-amber-400/70 group-hover:text-amber-300 transition flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Կտտացրու՝ հայերեն թարգմանությունը տեսնելու համար</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-amber-300/80 flex items-center justify-between">
                      <span>💡 Փորձիր 3 անգամ արագ ասել այս շուտասելուկը։</span>
                      <button
                        onClick={() => setShowCollectionModal(true)}
                        className="text-yellow-300 hover:text-white underline text-[11px]"
                      >
                        Բոլոր շուտասելուկները ({unlockedTrabalenguas.size}/20)
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Wrong answer card: user can still continue playing! */
                  <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200">
                    <div className="flex items-center gap-2 font-bold text-rose-400 mb-1">
                      <XCircle className="w-5 h-5" />
                      <span>Սխալ պատասխան</span>
                    </div>
                    <p className="text-sm">
                      Ճիշտ տարբերակն է՝{' '}
                      <span className="font-bold text-emerald-400 underline">
                        {currentQuestion.correctAnswer}) {currentQuestion.blankWord}
                      </span>
                    </p>
                    <p className="text-xs text-rose-300/80 mt-1">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}

                {/* Continue button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-sky-950 flex items-center gap-2 transition"
                  >
                    <span>Հաջորդ հարցը (Enter)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Actions (Pass / Next) */}
            {!justAnswered && (
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800/80 mt-2">
                <button
                  onClick={handlePass}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs sm:text-sm font-medium transition flex items-center gap-2"
                  title="Բաց թողնել և անցնել առաջ (Space)"
                >
                  <span>Պասապալաբրա (Բաց թողնել)</span>
                </button>

                <div className="text-xs text-slate-500 font-mono hidden sm:block">
                  Սեղմիր A, B, C, D կամ Space
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>
            💡 Յուրաքանչյուր ճիշտ պատասխանի դեպքում բացվում է իսպաներեն նոր շուտասելուկ (скороговорка)։
          </span>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              T: Հարցի թարգմանություն
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              Enter / Space: Հաջորդը
            </span>
          </div>
        </div>
      </div>

      {/* Trabalenguas (Tongue Twisters) Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Իսպաներեն Շուտասելուկներ (Trabalenguas)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Բացված է {unlockedTrabalenguas.size} / 20 շուտասելուկ (բացվում են ճիշտ պատասխանների դեպքում)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCollectionModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {FUTURO_QUESTIONS.map((q) => {
                const isUnlocked = unlockedTrabalenguas.has(q.trabalengua.id);
                const isArmenianOpen = trabalenguaArmenianOpen[q.trabalengua.id];

                if (!isUnlocked) {
                  return (
                    <div
                      key={q.trabalengua.id}
                      className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-slate-500 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-600" />
                        <span>Շուտասելուկ #{q.trabalengua.id}</span>
                        <span className="text-slate-600 font-mono">
                          (Կբացվի #{q.id} հարցին ճիշտ պատասխանելիս)
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={q.trabalengua.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/40 text-amber-100 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Շուտասելուկ #{q.trabalengua.id} (Հարց #{q.id})</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => speakSpanish(q.trabalengua.spanish)}
                        className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition"
                        title="Լսել արտասանությունը"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Spanish sentence - click to toggle Armenian translation */}
                    <div
                      onClick={() =>
                        setTrabalenguaArmenianOpen((prev) => ({
                          ...prev,
                          [q.trabalengua.id]: !prev[q.trabalengua.id],
                        }))
                      }
                      className="cursor-pointer group hover:text-yellow-200 transition"
                      title="Կտտացրու՝ հայերեն թարգմանությունը տեսնելու համար"
                    >
                      <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                        {q.trabalengua.spanish}
                      </p>

                      {isArmenianOpen ? (
                        <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-amber-200 font-serif">
                          <span className="text-amber-400 font-semibold mr-1">🇦🇲</span>
                          {q.trabalengua.armenian}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 group-hover:text-amber-300 mt-1 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>Կտտացրու հայերեն թարգմանության համար</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowCollectionModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Փակել
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Complete Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center mb-4">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">
              Ավարտվեց Խաղ 2-ը (Futuro Simple)
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Բոլոր 20 հարցերը լրացված են։
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                <div className="text-2xl font-black text-emerald-400">
                  {correctCount} / 20
                </div>
                <div className="text-xs text-emerald-300 font-medium mt-1">
                  Ճիշտ պատասխաններ
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40">
                <div className="text-2xl font-black text-amber-400">
                  {unlockedTrabalenguas.size} / 20
                </div>
                <div className="text-xs text-amber-300 font-medium mt-1">
                  Բացված շուտասելուկներ
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleRestart}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Խաղալ նորից</span>
              </button>

              <button
                onClick={() => {
                  setShowSummaryModal(false);
                  setShowCollectionModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Շուտասելուկների հավաքածու</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
