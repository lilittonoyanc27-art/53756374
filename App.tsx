import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { QUESTIONS, QuestionItem } from './questions.ts';
import { Rosco, LetterStatus } from './Rosco.tsx';
import { soundFx } from './audio.ts';
import { FuturoGame } from './FuturoGame.tsx';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Eye,
  EyeOff,
  Volume1,
  Award,
} from 'lucide-react';

export default function App() {
  // Game mode switcher ('pasapalabra' or 'futuro')
  const [activeGame, setActiveGame] = useState<'pasapalabra' | 'futuro'>('pasapalabra');

  // Game 1 states
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [statuses, setStatuses] = useState<Record<number, LetterStatus>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [showArmenian, setShowArmenian] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showGrammarGuide, setShowGrammarGuide] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [justAnswered, setJustAnswered] = useState<{
    isCorrect: boolean;
    chosen: 'A' | 'B' | 'C' | 'D';
    correct: 'A' | 'B' | 'C' | 'D';
    explanation: string;
  } | null>(null);

  const currentQuestion = QUESTIONS[currentIndex];

  // Count metrics
  const correctCount = useMemo(() => {
    return Object.values(statuses).filter((s) => s === 'correct').length;
  }, [statuses]);

  const wrongCount = useMemo(() => {
    return Object.values(statuses).filter((s) => s === 'wrong').length;
  }, [statuses]);

  const answeredCount = correctCount + wrongCount;
  const isGameOver = answeredCount === QUESTIONS.length;

  // Sound mute sync
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFx.isMuted = next;
  };

  // Find next unanswered or passed question
  const getNextAvailableIndex = useCallback(
    (fromIndex: number, currentStat: Record<number, LetterStatus>): number => {
      // First try to find in current cycle starting from fromIndex + 1
      for (let i = 1; i <= QUESTIONS.length; i++) {
        const nextIdx = (fromIndex + i) % QUESTIONS.length;
        const status = currentStat[nextIdx];
        if (status !== 'correct' && status !== 'wrong') {
          return nextIdx;
        }
      }
      return fromIndex; // None remaining
    },
    []
  );

  // Play again / Reset
  const handleRestart = () => {
    setStatuses({});
    setUserAnswers({});
    setCurrentIndex(0);
    setShowArmenian(false);
    setJustAnswered(null);
    setShowSummaryModal(false);
  };

  // Speak Spanish sentence
  const speakSpanish = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace('___', '...'));
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  // Answer handler
  const handleChooseAnswer = (choice: 'A' | 'B' | 'C' | 'D') => {
    if (justAnswered) return; // Wait until next
    const isCorrect = choice === currentQuestion.correctAnswer;

    if (isCorrect) {
      soundFx.playCorrect();
    } else {
      soundFx.playWrong();
    }

    const newStatuses: Record<number, LetterStatus> = {
      ...statuses,
      [currentIndex]: isCorrect ? 'correct' : 'wrong',
    };

    const newUserAnswers = {
      ...userAnswers,
      [currentIndex]: choice,
    };

    setStatuses(newStatuses);
    setUserAnswers(newUserAnswers);

    setJustAnswered({
      isCorrect,
      chosen: choice,
      correct: currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
    });
  };

  // Move to next question after reviewing feedback
  const handleAdvanceNext = useCallback(() => {
    const nextIdx = getNextAvailableIndex(currentIndex, statuses);
    const newAnsweredCount = Object.values(statuses).filter(
      (s) => s === 'correct' || s === 'wrong'
    ).length;

    if (newAnsweredCount === QUESTIONS.length) {
      soundFx.playVictory();
      setShowSummaryModal(true);
    } else {
      setCurrentIndex(nextIdx);
      setShowArmenian(false);
      setJustAnswered(null);
    }
  }, [currentIndex, statuses, getNextAvailableIndex]);

  // Pasapalabra (Pass/Skip) handler
  const handlePasapalabra = () => {
    if (justAnswered) {
      handleAdvanceNext();
      return;
    }
    soundFx.playPass();

    // Mark as passed if not already answered
    const currentStat = statuses[currentIndex];
    let newStatuses = statuses;
    if (currentStat !== 'correct' && currentStat !== 'wrong') {
      newStatuses = {
        ...statuses,
        [currentIndex]: 'passed',
      };
      setStatuses(newStatuses);
    }

    const nextIdx = getNextAvailableIndex(currentIndex, newStatuses);
    setCurrentIndex(nextIdx);
    setShowArmenian(false);
    setJustAnswered(null);
  };

  // Jump to specific letter
  const handleSelectLetter = (idx: number) => {
    setCurrentIndex(idx);
    setShowArmenian(false);
    setJustAnswered(null);
  };

  // Keyboard navigation
  useEffect(() => {
    if (activeGame !== 'pasapalabra') return;
    if (showGrammarGuide || showSummaryModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (justAnswered) {
          handleAdvanceNext();
        } else {
          handlePasapalabra();
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
  }, [activeGame, justAnswered, showGrammarGuide, showSummaryModal, handleAdvanceNext]);

  return (
    <div className="min-h-screen bg-radial from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col font-sans">
      {/* Top TV Game Show Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Pasapalabra Logo Badge */}
            <div className="relative flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 via-sky-500 to-amber-400 p-[2px] shadow-lg shadow-blue-500/20">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-black text-amber-400 text-lg tracking-wider">
                  P
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-wide text-white">
                  PASAPALABRA
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Անցյալ ժամանակներ
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Completa la frase con el tiempo pasado correcto (Pretéritos)
              </p>
            </div>
          </div>

          {/* Counters & Controls */}
          <div className="flex items-center gap-3">
            {/* TV Show Pasapalabra Counters */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-full px-3 py-1.5 shadow-inner">
              {/* Green (Correct) */}
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-sm font-bold shadow-sm"
                title="Ճիշտ պատասխաններ (Aciertos)"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{correctCount}</span>
              </div>

              {/* Red (Errors) */}
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-400 text-sm font-bold shadow-sm"
                title="Սխալներ (Fallos)"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>{wrongCount}</span>
              </div>

              {/* Blue (Remaining) */}
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-sm font-bold shadow-sm"
                title="Մնացած հարցեր (Pendientes)"
              >
                <span className="text-xs text-blue-400">Մնաց՝</span>
                <span>{QUESTIONS.length - answeredCount}</span>
              </div>
            </div>

            {/* Quick Grammar Guide Button */}
            <button
              onClick={() => setShowGrammarGuide(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Քերականական ուղեցույց (Tiempos pasados)"
              aria-label="Grammar Guide"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title={isMuted ? 'Միացնել ձայնը' : 'Անջատել ձայնը'}
              aria-label="Toggle Sound"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Restart Button */}
            <button
              onClick={handleRestart}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Սկսել նորից (Reiniciar)"
              aria-label="Restart Game"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Game Mode Switcher Tab Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 sticky top-[61px] z-20 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveGame('pasapalabra')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                activeGame === 'pasapalabra'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50 ring-1 ring-blue-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>🎮 Խաղ 1: Պասապալաբրա</span>
              <span className="text-[11px] opacity-80 hidden sm:inline">(Անցյալ — 27 հարց)</span>
            </button>

            <button
              onClick={() => setActiveGame('futuro')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                activeGame === 'futuro'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-md shadow-amber-900/50 ring-1 ring-amber-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>⚡ Խաղ 2: Ապառնի + Շուտասելուկներ</span>
              <span className="text-[11px] opacity-80 hidden sm:inline">(20 հարց)</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-400/30 text-amber-200 text-[10px] font-bold">
                ՆՈՐ
              </span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden md:block">
            {activeGame === 'pasapalabra'
              ? '⏳ Պասապալաբրա՝ առանց ժամանակի սահմանափակման'
              : '🗣️ Ճիշտ պատասխանելիս բացվում են շուտասելուկներ (скороговорки)'}
          </span>
        </div>
      </div>

      {activeGame === 'futuro' ? (
        <FuturoGame
          onSwitchToGame1={() => setActiveGame('pasapalabra')}
          isMuted={isMuted}
          toggleMute={toggleMute}
        />
      ) : (
        <>
          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Left / Center: The Famous Pasapalabra Rosco */}
        <div className="flex flex-col items-center justify-center relative">
          <div className="relative p-2 sm:p-4 rounded-3xl bg-slate-900/40 border border-slate-800/60 shadow-2xl backdrop-blur-sm">
            <Rosco
              questions={QUESTIONS}
              currentIndex={currentIndex}
              statuses={statuses}
              onSelectLetter={handleSelectLetter}
              size={typeof window !== 'undefined' && window.innerWidth < 640 ? 340 : 450}
            />

            {/* Center TV Rosco Emblem / Active Letter Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-radial from-blue-900 via-slate-950 to-black border-2 border-blue-500/50 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] text-center pointer-events-auto">
                <span className="text-[10px] font-bold text-sky-400 tracking-wider uppercase">
                  Տառ {currentQuestion.letter}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-amber-400 drop-shadow-md font-sans">
                  {currentQuestion.letter}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  #{currentQuestion.id}/27
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Ճիշտ (Correcto)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" /> Սխալ (Fallo)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Պասապալաբրա (Pasada)
            </span>
          </div>
        </div>

        {/* Right / Center: Question & Interactive Console */}
        <div className="w-full max-w-xl flex flex-col gap-4">
          {/* Question Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            {/* Top Bar of Card */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 font-bold text-white shadow-md text-sm">
                  {currentQuestion.letter}
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">
                    Հարց #{currentQuestion.id} — Տառ «{currentQuestion.letter}»
                  </h2>
                  <p className="text-[10px] text-slate-400 font-mono lowercase tracking-normal mt-0.5 flex items-center gap-1">
                    <span className="text-slate-500">подсказка:</span>
                    <span className="text-sky-300 font-medium">{currentQuestion.tenseName.toLowerCase()}</span>
                  </p>
                </div>
              </div>

              {/* Speech Button */}
              <button
                onClick={() => speakSpanish(currentQuestion.spanishSentence)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition shadow-sm"
                title="Լսել իսպաներեն արտասանությունը"
              >
                <Volume1 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Լսել</span>
              </button>
            </div>

            {/* Clickable Spanish Sentence (Reveals Armenian Translation on Click!) */}
            <div className="mb-4">
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
                    className={`flex items-center gap-3 p-3.5 rounded-xl border font-medium text-left transition-all duration-150 active:scale-98 ${btnStyle}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${
                        justAnswered && isCorrectOption
                          ? 'bg-emerald-500 text-white'
                          : justAnswered && isSelected && !isCorrectOption
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-900 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {opt.key}
                    </span>
                    <span className="text-sm font-semibold tracking-wide flex-1">
                      {opt.text}
                    </span>
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

            {/* Answer Feedback Banner (Even if incorrect, player continues!) */}
            {justAnswered && (
              <div
                className={`p-4 rounded-xl border mb-4 animate-in fade-in zoom-in-95 duration-200 ${
                  justAnswered.isCorrect
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {justAnswered.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-sm">
                    <p className="font-bold text-base mb-1">
                      {justAnswered.isCorrect
                        ? '¡Correcto! — Ճիշտ է 🎉'
                        : `¡Fallo! — Ճիշտ պատասխանն է՝ ${justAnswered.correct}) ${
                            currentQuestion.options.find((o) => o.key === justAnswered.correct)?.text
                          }`}
                    </p>
                    <p className="text-xs sm:text-sm opacity-90 leading-relaxed font-sans">
                      {justAnswered.explanation}
                    </p>
                    <p className="text-xs mt-1.5 opacity-80">
                      Ժամանակը՝ <strong className="underline">{currentQuestion.tenseName}</strong> (
                      {currentQuestion.tenseArmenian})
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleAdvanceNext}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-200 active:scale-95 transition shadow-lg"
                  >
                    <span>Հաջորդ հարցը (Siguiente)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Actions: PASAPALABRA & Next */}
            {!justAnswered && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={handlePasapalabra}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 font-bold text-white tracking-wider shadow-lg shadow-blue-900/40 border border-blue-400/40 transition"
                  title="Բաց թողնել և վերադառնալ հաջորդ շրջանում (Pasapalabra)"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>PASAPALABRA</span>
                  <span className="text-xs text-blue-200 font-normal hidden sm:inline">
                    (Բաց թողնել)
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Instructions & Quick Tenses Legend */}
      <footer className="border-t border-slate-800/70 bg-slate-950/80 px-4 py-3 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>
            🎮 <strong>Pasapalabra</strong> — 27 հարց իսպաներենի անցյալ ժամանակներով (առանց ժամանակաչափի)։
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              Space / Enter: Պասապալաբրա / Հաջորդը
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              A, B, C, D: Պատասխանել
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              T: Հայերեն թարգմանություն
            </span>
          </div>
        </div>
      </footer>

      {/* Grammar Reference Modal */}
      {showGrammarGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">
                  Իսպաներենի 4 հիմնական անցյալ ժամանակները
                </h3>
              </div>
              <button
                onClick={() => setShowGrammarGuide(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-300">
              {/* Pretérito Perfecto */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-sky-400 flex items-center justify-between">
                  <span>1. Pretérito Perfecto Compuesto</span>
                  <span className="text-xs text-slate-400 font-normal">he hablado, has comido</span>
                </h4>
                <p className="mt-1 text-slate-300 text-xs">
                  <strong>Երբ է օգտագործվում՝</strong> Գործողություն, որը կատարվել է դեռևս չավարտված ժամանակահատվածում (այսօր, այս շաբաթ, այս ամիս) կամ կյանքի փորձ նշելիս։
                </p>
                <div className="mt-2 text-[11px] text-amber-300/90 font-mono">
                  Բանալի բառեր՝ hoy, esta semana, este mes, este año, alguna vez, nunca, ya, todavía no.
                </div>
              </div>

              {/* Pretérito Indefinido */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-emerald-400 flex items-center justify-between">
                  <span>2. Pretérito Indefinido</span>
                  <span className="text-xs text-slate-400 font-normal">hablé, comí, fue, vio</span>
                </h4>
                <p className="mt-1 text-slate-300 text-xs">
                  <strong>Երբ է օգտագործվում՝</strong> Անցյալում լիովին ավարտված, կոնկրետ կետային գործողություններ հստակ նշված անցյալ ժամանակում։
                </p>
                <div className="mt-2 text-[11px] text-amber-300/90 font-mono">
                  Բանալի բառեր՝ ayer, anteayer, anoche, el año pasado, el sábado pasado, en 2024.
                </div>
              </div>

              {/* Pretérito Imperfecto */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-amber-400 flex items-center justify-between">
                  <span>3. Pretérito Imperfecto</span>
                  <span className="text-xs text-slate-400 font-normal">hablaba, comía, iba, jugaba</span>
                </h4>
                <p className="mt-1 text-slate-300 text-xs">
                  <strong>Երբ է օգտագործվում՝</strong> Անցյալում կրկնվող, սովորութային գործողություններ, իրավիճակների կամ մանկության նկարագրություն, ինչպես նաև ընթացքի մեջ գտնվող գործողություններ։
                </p>
                <div className="mt-2 text-[11px] text-amber-300/90 font-mono">
                  Բանալի բառեր՝ antes, cuando era pequeño, de niño, todos los días, siempre, mientras.
                </div>
              </div>

              {/* Pretérito Pluscuamperfecto */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-purple-400 flex items-center justify-between">
                  <span>4. Pretérito Pluscuamperfecto</span>
                  <span className="text-xs text-slate-400 font-normal">había hablado, había salido</span>
                </h4>
                <p className="mt-1 text-slate-300 text-xs">
                  <strong>Երբ է օգտագործվում՝</strong> Նախաանցյալ գործողություն, որն ավարտվել էր մինչև անցյալի մեկ այլ գործողություն սկսվելը։
                </p>
                <div className="mt-2 text-[11px] text-amber-300/90 font-mono">
                  Բանալի բառեր՝ ya había hecho..., cuando llegué ya habían salido.
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowGrammarGuide(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-sm"
              >
                Փակել և շարունակել խաղը
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Complete Modal / Summary */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
              <Award className="w-8 h-8 text-slate-950" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
              ¡Fin de Pasapalabra!
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Դուք ավարտեցիք Ռոսկոյի բոլոր 27 հարցերը։
            </p>

            {/* Scoreboard Cards */}
            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                  {correctCount}
                </span>
                <p className="text-xs text-emerald-200 mt-1 font-semibold">
                  Ճիշտ պատասխաններ (Aciertos)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50">
                <span className="text-3xl sm:text-4xl font-black text-rose-400">
                  {wrongCount}
                </span>
                <p className="text-xs text-rose-200 mt-1 font-semibold">
                  Սխալներ (Fallos)
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={handleRestart}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold shadow-lg shadow-blue-900/50 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Կրկին խաղալ (Jugar otra vez)</span>
              </button>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
              >
                Դիտել Ռոսկոն
              </button>
            </div>

            {/* Detailed review list */}
            <div className="w-full mt-6 text-left border-t border-slate-800 pt-5">
              <h4 className="text-sm font-bold text-slate-300 mb-3">
                Հարցերի և պատասխանների ամփոփում (27 հարց)՝
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {QUESTIONS.map((q, i) => {
                  const stat = statuses[i];
                  const chosen = userAnswers[i];
                  const isCorrect = stat === 'correct';

                  return (
                    <div
                      key={q.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                        isCorrect
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                          : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-amber-400 mr-1.5">
                          {q.letter}.
                        </span>
                        <span className="font-medium text-white">
                          {q.spanishSentence.replace('___', `[${q.blankWord}]`)}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-serif">
                          🇦🇲 {q.armenianTranslation}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {chosen || '-'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
