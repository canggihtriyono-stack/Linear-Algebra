import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { CHARACTERS, type MissionConfig } from '../data/campaign';
import {
  evaluateObjective,
  evaluateReflectionAnswer,
  isSameConstraint,
  parseLinearConstraintInput,
  parseLinearExpression,
  type Point2D,
} from '../engine/linearMath';
import { soundFX } from '../utils/sound';
import { CartesianExplorer } from './CartesianExplorer';
import { CharacterPortrait } from './CharacterPortrait';
import { FleetTester } from './FleetTester';
import { InequalityPlayground } from './InequalityPlayground';

interface MissionWorkspaceProps {
  mission: MissionConfig;
  alreadyCompleted: boolean;
  onRecordAttempt: (correct: boolean) => void;
  onCompleteMission: (missionId: number, rewardCoins: number) => void;
}

export function MissionWorkspace({
  mission,
  alreadyCompleted,
  onRecordAttempt,
  onCompleteMission,
}: MissionWorkspaceProps) {
  // Dialogue expansion
  const [showAllDialogue, setShowAllDialogue] = useState(false);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizFeedback, setQuizFeedback] = useState<{
    correct: boolean;
    text: string;
  } | null>(null);

  // Reflection state (Mission 1)
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionResult, setReflectionResult] = useState<{
    valid: boolean;
    feedback: string;
  } | null>(null);

  // Discovery state (Missions 2, 3, 4)
  const [discoveryAnswers, setDiscoveryAnswers] = useState<Record<string, boolean>>({});
  const [discoveryInputs, setDiscoveryInputs] = useState<Record<string, string>>({});
  const [discoveryFeedback, setDiscoveryFeedback] = useState<Record<string, string>>({});

  // Fleet stage state (Mission 4)
  const [fleetDone, setFleetDone] = useState(false);

  // Coordinate stage state (Mission 5)
  const [coordCompareAnswer, setCoordCompareAnswer] = useState<boolean>(false);
  const [coordCompareError, setCoordCompareError] = useState<string | null>(null);
  const [coordTestResults, setCoordTestResults] = useState<Record<number, boolean>>({});
  const [coordTestFeedback, setCoordTestFeedback] = useState<string | null>(null);

  // Graph corner selection state (Mission 7)
  const [selectedCorners, setSelectedCorners] = useState<Point2D[]>([]);
  const [cornerNotice, setCornerNotice] = useState<string | null>(null);
  const [intersectionInputX, setIntersectionInputX] = useState('');
  const [intersectionInputY, setIntersectionInputY] = useState('');
  const [intersectionSolved, setIntersectionSolved] = useState(false);
  const [intersectionError, setIntersectionError] = useState<string | null>(null);

  // Optimization stage state (Missions 9, 10, 11, 12)
  const [modelConstraintInputs, setModelConstraintInputs] = useState(['', '']);
  const [modelObjInput, setModelObjInput] = useState('');
  const [modelVerified, setModelVerified] = useState(
    !mission.optimizationStage?.buildModelFirst
  );
  const [modelError, setModelError] = useState<string | null>(null);

  const [cornerZInputs, setCornerZInputs] = useState<Record<string, string>>({});
  const [cornerZVerified, setCornerZVerified] = useState<Record<string, boolean>>({});
  const [cornerZError, setCornerZError] = useState<string | null>(null);
  const [chosenOptimalIdx, setChosenOptimalIdx] = useState<number | null>(null);
  const [optimalError, setOptimalError] = useState<string | null>(null);
  const [optimalSolved, setOptimalSolved] = useState(false);

  // Candidate points for Mission 7 (4 real corners + 2 interior/non-corner decoys)
  const m7Candidates = useMemo<Point2D[]>(() => {
    if (mission.id !== 7) return [];
    return [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 2, y: 6 },
      { x: 0, y: 8 },
      { x: 2, y: 3 }, // interior feasible point (decoy)
      { x: 4, y: 2 }, // boundary non-corner point (decoy)
    ];
  }, [mission.id]);

  // Determine mission completion state
  const quizDone = useMemo(() => {
    if (!mission.quizQuestions || mission.quizQuestions.length === 0) return true;
    return mission.quizQuestions.every(
      (q) => quizAnswers[q.id] === q.correctIndex
    );
  }, [mission.quizQuestions, quizAnswers]);

  const reflectionDone = useMemo(() => {
    if (!mission.reflectionPrompt) return true;
    return Boolean(reflectionResult?.valid);
  }, [mission.reflectionPrompt, reflectionResult]);

  const discoveryDone = useMemo(() => {
    if (!mission.discoveryStage) return true;
    return mission.discoveryStage.prompts.every((p) => discoveryAnswers[p.id]);
  }, [mission.discoveryStage, discoveryAnswers]);

  const fleetStageDone = useMemo(() => {
    if (!mission.fleetStage) return true;
    return fleetDone;
  }, [mission.fleetStage, fleetDone]);

  const coordDone = useMemo(() => {
    if (!mission.coordinateStage) return true;
    return (
      coordCompareAnswer &&
      mission.coordinateStage.testPoints.every((_, idx) => coordTestResults[idx])
    );
  }, [mission.coordinateStage, coordCompareAnswer, coordTestResults]);

  const graphDone = useMemo(() => {
    if (!mission.graphStage || !mission.graphStage.requireCornerSelection) return true;
    const expected = mission.graphStage.expectedCorners;
    const allCornersSelected = expected.every((ep) =>
      selectedCorners.some((sc) => sc.x === ep.x && sc.y === ep.y)
    );
    const interOk = mission.graphStage.intersectionStep ? intersectionSolved : true;
    return allCornersSelected && interOk && selectedCorners.length === expected.length;
  }, [mission.graphStage, selectedCorners, intersectionSolved]);

  const optDone = useMemo(() => {
    if (!mission.optimizationStage) return true;
    return modelVerified && optimalSolved;
  }, [mission.optimizationStage, modelVerified, optimalSolved]);

  const isMissionComplete =
    quizDone &&
    reflectionDone &&
    discoveryDone &&
    fleetStageDone &&
    coordDone &&
    graphDone &&
    optDone;

  // Handlers
  const handleAnswerQuiz = (optionIdx: number) => {
    const q = mission.quizQuestions?.[quizIndex];
    if (!q) return;
    const isCorrect = optionIdx === q.correctIndex;
    onRecordAttempt(isCorrect);
    if (isCorrect) {
      soundFX.playSuccess();
      setQuizAnswers((prev) => ({ ...prev, [q.id]: optionIdx }));
      setQuizFeedback({ correct: true, text: q.explanation });
    } else {
      soundFX.playError();
      setQuizFeedback({
        correct: false,
        text: 'Belum tepat, Kapten. Perhatikan kata kunci batasnya lalu coba lagi.',
      });
    }
  };

  const handleSubmitReflection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mission.reflectionPrompt) return;
    const res = evaluateReflectionAnswer(
      reflectionText,
      mission.reflectionPrompt.keywords
    );
    onRecordAttempt(res.valid);
    if (res.valid) {
      soundFX.playSuccess();
    } else {
      soundFX.playError();
    }
    setReflectionResult(res);
  };

  const handleCheckDiscoveryPrompt = (promptId: string) => {
    const prompt = mission.discoveryStage?.prompts.find((p) => p.id === promptId);
    if (!prompt) return;

    if (prompt.numericAnswer !== undefined) {
      const val = Number(discoveryInputs[promptId]?.trim());
      const ok = val === prompt.numericAnswer;
      onRecordAttempt(ok);
      if (ok) {
        soundFX.playSuccess();
        setDiscoveryAnswers((prev) => ({ ...prev, [promptId]: true }));
        setDiscoveryFeedback((prev) => ({
          ...prev,
          [promptId]: `Benar! Jawabannya adalah ${prompt.numericAnswer}.`,
        }));
      } else {
        soundFX.playError();
        setDiscoveryFeedback((prev) => ({
          ...prev,
          [promptId]: `Belum tepat. Petunjuk: ${prompt.hint}`,
        }));
      }
      return;
    }

    if (prompt.modelExpected) {
      const parsed = parseLinearConstraintInput(discoveryInputs[promptId] || '');
      const ok = Boolean(parsed && isSameConstraint(parsed, prompt.modelExpected));
      onRecordAttempt(ok);
      if (ok) {
        soundFX.playSuccess();
        setDiscoveryAnswers((prev) => ({ ...prev, [promptId]: true }));
        setDiscoveryFeedback((prev) => ({
          ...prev,
          [promptId]: 'Tepat sekali! Model pertidaksamaan berhasil disusun.',
        }));
      } else {
        soundFX.playError();
        setDiscoveryFeedback((prev) => ({
          ...prev,
          [promptId]: `Format belum sesuai. Petunjuk: ${prompt.hint}`,
        }));
      }
    }
  };

  const handleToggleCornerM7 = (pt: Point2D) => {
    const expected = mission.graphStage?.expectedCorners || [];
    const isRealCorner = expected.some((e) => e.x === pt.x && e.y === pt.y);
    if (!isRealCorner) {
      soundFX.playError();
      onRecordAttempt(false);
      setCornerNotice(
        `Titik (${pt.x}, ${pt.y}) memang memenuhi pertidaksamaan, tetapi BUKAN titik pojok (sudut poligon batas)! Cari perpotongan garis batas.`
      );
      return;
    }

    soundFX.playClick();
    setCornerNotice(null);
    setSelectedCorners((prev) => {
      const exists = prev.some((s) => s.x === pt.x && s.y === pt.y);
      if (exists) return prev.filter((s) => !(s.x === pt.x && s.y === pt.y));
      return [...prev, pt];
    });
  };

  const handleCheckIntersectionM7 = (e: React.FormEvent) => {
    e.preventDefault();
    const sol = mission.graphStage?.intersectionStep?.solution;
    if (!sol) return;
    const x = Number(intersectionInputX.trim());
    const y = Number(intersectionInputY.trim());
    const ok = x === sol.x && y === sol.y;
    onRecordAttempt(ok);
    if (ok) {
      soundFX.playSuccess();
      setIntersectionSolved(true);
      setIntersectionError(null);
    } else {
      soundFX.playError();
      setIntersectionError(
        'Belum tepat. Kurangkan persamaan 2x + y = 10 dengan x + y = 8 untuk mencari nilai x, lalu substitusi untuk y.'
      );
    }
  };

  const handleVerifyOptModel = (e: React.FormEvent) => {
    e.preventDefault();
    const stage = mission.optimizationStage;
    if (!stage) return;

    const c1 = parseLinearConstraintInput(modelConstraintInputs[0]);
    const c2 = parseLinearConstraintInput(modelConstraintInputs[1]);
    const obj = parseLinearExpression(modelObjInput);

    if (!c1 || !c2 || !obj) {
      soundFX.playError();
      setModelError(
        'Pastikan kedua pertidaksamaan (misal 2x + y <= 20) dan fungsi objektif (misal 3x + 5y) terisi dengan format aljabar yang benar.'
      );
      return;
    }

    const exp1 = stage.constraints[0];
    const exp2 = stage.constraints[1];
    const matchDirect =
      isSameConstraint(c1, exp1) && isSameConstraint(c2, exp2);
    const matchSwapped =
      isSameConstraint(c1, exp2) && isSameConstraint(c2, exp1);
    const matchObj =
      obj.px === stage.objective.px && obj.py === stage.objective.py;

    const ok = (matchDirect || matchSwapped) && matchObj;
    onRecordAttempt(ok);

    if (ok) {
      soundFX.playSuccess();
      setModelVerified(true);
      setModelError(null);
    } else {
      soundFX.playError();
      setModelError(
        stage.independentMode
          ? 'Model belum tepat. Periksa kembali koefisien kebutuhan mesiu, meriam, serta poin kekuatan dari tabel Raja Aurelius.'
          : 'Model belum tepat. Periksa kembali koefisien dari tabel kebutuhan kayu, besi, dan keuntungan.'
      );
    }
  };

  const handleCheckCornerZ = (corner: Point2D) => {
    const stage = mission.optimizationStage;
    if (!stage) return;
    const key = `${corner.x},${corner.y}`;
    const expectedZ = evaluateObjective(corner, stage.objective);
    const typed = Number(cornerZInputs[key]?.trim());
    const ok = typed === expectedZ;
    onRecordAttempt(ok);
    if (ok) {
      soundFX.playClick();
      setCornerZVerified((prev) => ({ ...prev, [key]: true }));
      setCornerZError(null);
    } else {
      soundFX.playError();
      setCornerZError(
        `Perhitungan Z di titik (${corner.x}, ${corner.y}) belum tepat. Substitusikan x=${corner.x} dan y=${corner.y} ke Z = ${stage.objective.px}x + ${stage.objective.py}y.`
      );
    }
  };

  const handleChooseOptimalCorner = (idx: number) => {
    const stage = mission.optimizationStage;
    if (!stage) return;
    const corner = stage.expectedCorners[idx];
    const isOpt =
      corner.x === stage.optimalPoint.x && corner.y === stage.optimalPoint.y;
    onRecordAttempt(isOpt);
    setChosenOptimalIdx(idx);
    if (isOpt) {
      soundFX.playSuccess();
      setOptimalSolved(true);
      setOptimalError(null);
    } else {
      soundFX.playError();
      setOptimalError(
        stage.objective.goal === 'max'
          ? 'Titik ini belum memberikan nilai Z yang paling besar. Bandingkan kembali keempat hasil titik pojok!'
          : 'Titik ini belum memberikan biaya Z yang paling kecil. Cari nilai terkecil!'
      );
    }
  };

  // Plotted points for Mission 5 & 6
  const plottedPoints = useMemo(() => {
    if (mission.id === 5 && mission.coordinateStage) {
      return [
        ...mission.coordinateStage.comparePoints.map((p) => ({
          point: p,
          label: `(${p.x},${p.y})`,
          status: 'neutral' as const,
        })),
        ...mission.coordinateStage.testPoints.map((t, idx) => ({
          point: t.point,
          label: `(${t.point.x},${t.point.y})`,
          status: coordTestResults[idx]
            ? t.expectedValid
              ? ('valid' as const)
              : ('invalid' as const)
            : ('neutral' as const),
        })),
      ];
    }
    if (mission.id === 6) {
      return [
        { point: { x: 2, y: 6 }, label: '(2,6)', status: 'valid' as const },
        { point: { x: 4, y: 3 }, label: '(4,3)', status: 'invalid' as const },
      ];
    }
    return [];
  }, [mission.id, mission.coordinateStage, coordTestResults]);

  const visibleDialogue = showAllDialogue
    ? mission.dialogue
    : mission.dialogue.slice(0, 1);

  return (
    <div className="max-w-[1380px] w-full mx-auto px-4 md:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT STAGE (7 cols): Compact Story Briefing + Interactive Visual Simulator */}
      <div className="lg:col-span-7 space-y-4">
        {/* Story & Crew Dialogue Panel */}
        <section className="bg-[#102033] border border-[#253F5C] rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E354E] pb-3">
            <CharacterPortrait characterId={mission.leadCharacter} size="sm" />
            <div className="flex items-center gap-4">
              {mission.dialogue.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowAllDialogue((v) => !v)}
                  className="text-xs font-medium text-[#D49A2A] hover:underline cursor-pointer whitespace-nowrap"
                >
                  {showAllDialogue
                    ? 'Ringkas dialog'
                    : `Lihat ${mission.dialogue.length} dialog kru`}
                </button>
              )}
              <div className="text-right">
                <div className="text-[11px] text-[#8FA4BC]">Hadiah Misi</div>
                <div className="font-math text-xs font-bold text-[#F4C456] tabular-nums">
                  +{mission.rewardCoins} Koin Emas
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {visibleDialogue.map((line, i) => {
              const speaker = CHARACTERS[line.speaker];
              return (
                <div
                  key={i}
                  className="bg-[#0B1726]/80 border border-[#1E354E] rounded-lg px-3.5 py-2.5 space-y-0.5"
                >
                  <div
                    className="text-[11px] font-bold tracking-wide"
                    style={{ color: speaker.accentColor }}
                  >
                    {speaker.name}
                  </div>
                  <p className="text-xs md:text-sm text-[#E4ECF5] leading-relaxed">{line.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Interactive Stage by Mission Chapter */}
        {(mission.id === 1 || mission.id === 2) && (
          <InequalityPlayground missionId={mission.id} />
        )}

        {mission.id === 3 && (
          <FleetTester
            mode="merchant"
            constraints={[
              { id: 'm3', a: 2, b: 3, op: '<=', rhs: 36, label: '2x + 3y ≤ 36' },
            ]}
          />
        )}

        {mission.id === 4 && mission.fleetStage && (
          <FleetTester
            mode="shipyard"
            constraints={mission.fleetStage.constraints}
            combinations={mission.fleetStage.combinationsToTest}
            onAllCombinationsClassified={() => {
              soundFX.playSuccess();
              setFleetDone(true);
            }}
          />
        )}

        {mission.id === 5 && mission.coordinateStage && (
          <CartesianExplorer
            constraints={[mission.coordinateStage.constraint]}
            maxAxis={10}
            xLabel="Sumbu X"
            yLabel="Sumbu Y"
            plottedPoints={plottedPoints}
          />
        )}

        {(mission.id === 6 || mission.id === 7) && mission.graphStage && (
          <CartesianExplorer
            constraints={mission.graphStage.constraints}
            maxAxis={mission.graphStage.maxAxis}
            xLabel={mission.graphStage.xLabel}
            yLabel={mission.graphStage.yLabel}
            plottedPoints={plottedPoints}
            selectableCorners={
              mission.graphStage.requireCornerSelection ? m7Candidates : undefined
            }
            selectedCorners={selectedCorners}
            onToggleCorner={handleToggleCornerM7}
          />
        )}

        {mission.id === 8 && (
          <CartesianExplorer
            constraints={[
              { id: 'c1', label: 'x + y ≤ 8', a: 1, b: 1, op: '<=', rhs: 8, color: '#2A9D8F' },
              { id: 'c2', label: '2x + y ≤ 10', a: 2, b: 1, op: '<=', rhs: 10, color: '#D49A2A' },
            ]}
            maxAxis={11}
            xLabel="Produk A (x)"
            yLabel="Produk B (y)"
            objective={{ px: 3, py: 5, goal: 'max' }}
            plottedPoints={[
              { point: { x: 2, y: 3 }, label: '(2,3) Z=21', status: 'valid' },
              { point: { x: 4, y: 2 }, label: '(4,2) Z=22', status: 'valid' },
            ]}
          />
        )}

        {mission.optimizationStage && (
          <CartesianExplorer
            constraints={mission.optimizationStage.constraints}
            maxAxis={mission.optimizationStage.maxAxis}
            xLabel={mission.optimizationStage.xLabel}
            yLabel={mission.optimizationStage.yLabel}
            objective={mission.optimizationStage.objective}
            hideConstraints={
              Boolean(mission.optimizationStage.buildModelFirst) && !modelVerified
            }
            optimalPoint={
              optimalSolved ? mission.optimizationStage.optimalPoint : undefined
            }
            optimalValue={
              optimalSolved ? mission.optimizationStage.optimalValue : undefined
            }
            plottedPoints={
              modelVerified
                ? mission.optimizationStage.expectedCorners.map((pt) => ({
                    point: pt,
                    label: `(${pt.x},${pt.y})`,
                    status:
                      optimalSolved &&
                      pt.x === mission.optimizationStage?.optimalPoint.x &&
                      pt.y === mission.optimizationStage?.optimalPoint.y
                        ? 'valid'
                        : 'neutral',
                  }))
                : []
            }
          />
        )}
      </div>

      {/* RIGHT DECK (5 cols): Concept Reference + Interactive Challenge & Verification */}
      <div className="lg:col-span-5 space-y-5">
        {/* Concept Material Card */}
        {mission.conceptTitle && (
          <section className="bg-[#102033] border border-[#253F5C] rounded-xl p-5 space-y-3.5">
            <h2 className="font-display text-base font-bold text-[#F4C456]">
              {mission.conceptTitle}
            </h2>
            {mission.conceptBody && (
              <p className="text-xs md:text-sm text-[#C8D4E3] leading-relaxed">
                {mission.conceptBody}
              </p>
            )}

            {mission.inequalityTable && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#253F5C] text-[#9FB0C4]">
                      <th className="py-2 pr-2">Simbol</th>
                      <th className="py-2 px-2">Dibaca</th>
                      <th className="py-2 pl-2">Makna</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E354E]">
                    {mission.inequalityTable.map((row) => (
                      <tr key={row.symbol}>
                        <td className="py-2 pr-2 font-math text-base font-bold text-[#D49A2A]">
                          {row.symbol}
                        </td>
                        <td className="py-2 px-2 text-[#F4EBD9] font-medium">
                          {row.spoken}
                        </td>
                        <td className="py-2 pl-2 text-[#B8C6D6]">{row.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {mission.translationExamples && (
              <div className="space-y-1.5">
                {mission.translationExamples.map((ex) => (
                  <div
                    key={ex.model}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0B1726] border border-[#1E354E] text-xs"
                  >
                    <span className="text-[#D8E1EB]">{ex.sentence}</span>
                    <span className="font-math font-bold text-[#9CF0E4] shrink-0">
                      {ex.model}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Resource Table (Missions 11 & 12) */}
        {mission.optimizationStage?.resourceTable && (
          <section className="bg-[#102033] border border-[#253F5C] rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-[#F4C456]">
              Tabel Sumber Daya & Kekuatan
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#253F5C] text-[#9FB0C4]">
                    {mission.optimizationStage.resourceTable.headers.map((h) => (
                      <th key={h} className="py-2 px-2 first:pl-0 last:pr-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E354E]">
                  {mission.optimizationStage.resourceTable.rows.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={`py-2 px-2 first:pl-0 last:pr-0 ${
                            ci === 0
                              ? 'font-medium text-[#F4EBD9]'
                              : 'font-math font-bold text-[#D49A2A] tabular-nums'
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Quiz Challenge Stage (Missions 1, 2, 6, 8) */}
        {mission.quizQuestions && mission.quizQuestions.length > 0 && (
          <section className="bg-[#102033] border border-[#253F5C] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-[#F4EBD9]">
                {mission.quizTitle || 'Tantangan Kapten'}
              </h2>
              <span className="font-math text-xs text-[#D49A2A] tabular-nums">
                {quizIndex + 1} / {mission.quizQuestions.length}
              </span>
            </div>

            {(() => {
              const q = mission.quizQuestions[quizIndex];
              const isSolved = quizAnswers[q.id] === q.correctIndex;
              return (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#E4ECF5] leading-relaxed bg-[#0B1726] border border-[#1E354E] rounded-lg p-3.5">
                    {q.prompt}
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, idx) => {
                      const picked = quizAnswers[q.id] === idx;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerQuiz(idx)}
                          className={`text-left px-4 py-2.5 rounded-lg border text-sm font-math transition-colors cursor-pointer flex items-center justify-between ${
                            picked
                              ? 'bg-[#123332] border-[#2A9D8F] text-[#9CF0E4] font-bold'
                              : 'bg-[#0D1A2B] border-[#253F5C] hover:border-[#D49A2A] text-[#E4ECF5]'
                          }`}
                        >
                          <span>
                            {String.fromCharCode(65 + idx)}. {opt}
                          </span>
                          {picked && <CheckCircle2 className="w-4 h-4 text-[#2A9D8F]" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>

                  {quizFeedback && (
                    <div
                      className={`p-3 rounded-lg border text-xs leading-relaxed ${
                        quizFeedback.correct
                          ? 'bg-[#123332] border-[#2A9D8F]/60 text-[#9CF0E4]'
                          : 'bg-[#36181A] border-[#C94A38]/60 text-[#FFC2BA]'
                      }`}
                    >
                      {quizFeedback.text}
                    </div>
                  )}

                  {isSolved && quizIndex < mission.quizQuestions.length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuizIndex((i) => i + 1);
                        setQuizFeedback(null);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#D49A2A] hover:bg-[#E0AA3E] text-[#0B1726] font-semibold text-xs cursor-pointer"
                    >
                      Pertanyaan Berikutnya
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })()}
          </section>
        )}

        {/* Reflection Stage (Mission 1) */}
        {mission.reflectionPrompt && (
          <section className="bg-[#102033] border border-[#253F5C] rounded-xl p-5 space-y-3.5">
            <h2 className="font-display text-base font-bold text-[#F4C456]">
              Pertanyaan Refleksi Orion
            </h2>
            <p className="text-sm text-[#D8E1EB] leading-relaxed">
              "{mission.reflectionPrompt.question}"
            </p>
            <form onSubmit={handleSubmitReflection} className="space-y-3">
              <label htmlFor="reflection-input" className="sr-only">
                Tuliskan kesimpulan refleksimu
              </label>
              <textarea
                id="reflection-input"
                rows={3}
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Tuliskan kesimpulanmu dengan kalimat sendiri (misal: maksimal 30 berarti angka 30 masih boleh dibawa...)"
                className="w-full rounded-lg bg-[#0B1726] border border-[#2C4766] focus:border-[#D49A2A] focus:outline-none p-3 text-sm text-[#F4EBD9] placeholder-[#6B8199]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#152B44] hover:bg-[#1D3856] border border-[#D49A2A]/50 text-xs font-semibold text-[#F4C456] cursor-pointer"
              >
                Kirim Refleksi ke Orion
              </button>
            </form>

            {reflectionResult && (
              <div
                className={`p-3 rounded-lg border text-xs leading-relaxed ${
                  reflectionResult.valid
                    ? 'bg-[#123332] border-[#2A9D8F]/60 text-[#9CF0E4]'
                    : 'bg-[#36181A] border-[#C94A38]/60 text-[#FFC2BA]'
                }`}
              >
                {reflectionResult.feedback}
              </div>
            )}
          </section>
        )}

        {/* Guided Discovery Stage (Missions 2, 3, 4) */}
        {mission.discoveryStage && (
          <section className="bg-[#102033] border border-[#253F5C] rounded-xl p-5 space-y-4">
            <h2 className="font-display text-base font-bold text-[#F4C456]">
              {mission.discoveryStage.title}
            </h2>
            <p className="text-xs text-[#C8D4E3] leading-relaxed">
              {mission.discoveryStage.scenario}
            </p>

            <div className="space-y-4">
              {mission.discoveryStage.prompts.map((p, idx) => {
                const solved = Boolean(discoveryAnswers[p.id]);
                const val = discoveryInputs[p.id] || '';
                return (
                  <div
                    key={p.id}
                    className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <label
                        htmlFor={`disc-${p.id}`}
                        className="text-xs font-medium text-[#F4EBD9] leading-relaxed"
                      >
                        {idx + 1}. {p.question}
                      </label>
                      {solved && (
                        <CheckCircle2 className="w-4 h-4 text-[#2A9D8F] shrink-0" aria-hidden="true" />
                      )}
                    </div>

                    {p.options ? (
                      <div className="space-y-1.5">
                        {p.options.map((opt, optIdx) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const ok = optIdx === p.correctOptionIndex;
                              onRecordAttempt(ok);
                              if (ok) {
                                soundFX.playSuccess();
                                setDiscoveryAnswers((prev) => ({
                                  ...prev,
                                  [p.id]: true,
                                }));
                                setDiscoveryFeedback((prev) => ({
                                  ...prev,
                                  [p.id]: 'Benar!',
                                }));
                              } else {
                                soundFX.playError();
                                setDiscoveryFeedback((prev) => ({
                                  ...prev,
                                  [p.id]: `Belum tepat. Petunjuk: ${p.hint}`,
                                }));
                              }
                            }}
                            className={`w-full text-left px-3 py-2 rounded border text-xs cursor-pointer transition-colors ${
                              solved && optIdx === p.correctOptionIndex
                                ? 'bg-[#123332] border-[#2A9D8F] text-[#9CF0E4] font-semibold'
                                : 'bg-[#102033] border-[#253F5C] hover:border-[#D49A2A] text-[#D8E1EB]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            id={`disc-${p.id}`}
                            type="text"
                            value={val}
                            onChange={(e) =>
                              setDiscoveryInputs((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                            placeholder={p.placeholder}
                            className="flex-1 rounded-md bg-[#102033] border border-[#2C4766] focus:border-[#D49A2A] focus:outline-none px-3 py-1.5 text-sm font-math text-[#F4EBD9]"
                          />
                          <button
                            type="button"
                            onClick={() => handleCheckDiscoveryPrompt(p.id)}
                            className="px-3.5 py-1.5 rounded-md bg-[#D49A2A] hover:bg-[#E0AA3E] text-[#0B1726] font-semibold text-xs cursor-pointer whitespace-nowrap"
                          >
                            Periksa
                          </button>
                        </div>
                        {p.modelExpected && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#8FA4BC]">
                            <span>Sisipkan tanda:</span>
                            {['<=', '>=', '<', '>'].map((sym) => (
                              <button
                                key={sym}
                                type="button"
                                onClick={() =>
                                  setDiscoveryInputs((prev) => ({
                                    ...prev,
                                    [p.id]: (prev[p.id] || '') + ` ${sym} `,
                                  }))
                                }
                                className="px-2 py-0.5 rounded bg-[#152B44] border border-[#2C4766] font-math text-[#F4EBD9] hover:border-[#D49A2A] cursor-pointer"
                              >
                                {sym === '<=' ? '≤' : sym === '>=' ? '≥' : sym}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {discoveryFeedback[p.id] && (
                      <div
                        className={`text-xs ${
                          solved ? 'text-[#9CF0E4]' : 'text-[#FFC2BA]'
                        }`}
                      >
                        {discoveryFeedback[p.id]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Coordinate Lab Stage (Mission 5) */}
        {mission.coordinateStage && (
          <section className="bg-[#102033] border border-[#253F5C] rounded-xl p-5 space-y-4">
            <h2 className="font-display text-base font-bold text-[#F4C456]">
              {mission.coordinateStage.title}
            </h2>

            {/* Part A: Order of (3,2) vs (2,3) */}
            <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3.5 space-y-2.5">
              <div className="text-xs font-medium text-[#F4EBD9]">
                1. Mengapa posisi (3, 2) berbeda dengan (2, 3) pada peta?
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    label: 'Sama saja karena angka penyusunnya 2 dan 3',
                    ok: false,
                  },
                  {
                    label:
                      'Berbeda! Angka pertama selalu sumbu X (horizontal) dan angka kedua sumbu Y (vertikal)',
                    ok: true,
                  },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      onRecordAttempt(opt.ok);
                      if (opt.ok) {
                        soundFX.playSuccess();
                        setCoordCompareAnswer(true);
                        setCoordCompareError(null);
                      } else {
                        soundFX.playError();
                        setCoordCompareError(
                          'Perhatikan peta! (3, 2) berarti 3 langkah ke kanan dan 2 ke atas.'
                        );
                      }
                    }}
                    className={`text-left px-3 py-2 rounded border text-xs cursor-pointer ${
                      coordCompareAnswer && opt.ok
                        ? 'bg-[#123332] border-[#2A9D8F] text-[#9CF0E4] font-semibold'
                        : 'bg-[#102033] border-[#253F5C] hover:border-[#D49A2A] text-[#D8E1EB]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {coordCompareError && (
                <div className="text-xs text-[#FFC2BA]">{coordCompareError}</div>
              )}
            </div>

            {/* Part B: Is This Point Safe? */}
            <div className="space-y-2.5">
              <div className="text-xs font-medium text-[#F4EBD9]">
                2. Uji apakah titik berikut memenuhi pertidaksamaan{' '}
                <span className="font-math text-[#9CF0E4]">x + y ≤ 8</span>:
              </div>
              {mission.coordinateStage.testPoints.map((tp, idx) => {
                const solved = Boolean(coordTestResults[idx]);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 bg-[#0B1726] border border-[#1E354E] rounded-lg px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-math font-bold text-[#F4C456]">
                        Titik ({tp.point.x}, {tp.point.y})
                      </span>
                      {solved && (
                        <div className="text-[11px] text-[#9CF0E4] mt-0.5">
                          {tp.reason}
                        </div>
                      )}
                    </div>

                    {solved ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2A9D8F] shrink-0" aria-hidden="true" />
                    ) : (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const ok = tp.expectedValid === true;
                            onRecordAttempt(ok);
                            if (ok) {
                              soundFX.playSuccess();
                              setCoordTestResults((prev) => ({
                                ...prev,
                                [idx]: true,
                              }));
                              setCoordTestFeedback(null);
                            } else {
                              soundFX.playError();
                              setCoordTestFeedback(
                                `Substitusi (${tp.point.x},${tp.point.y}): ${tp.point.x} + ${tp.point.y} = ${
                                  tp.point.x + tp.point.y
                                }. Bandingkan dengan ≤ 8!`
                              );
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-[#163839] hover:bg-[#1E4A4B] border border-[#2A9D8F]/50 text-[#9CF0E4] cursor-pointer"
                        >
                          Memenuhi
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const ok = tp.expectedValid === false;
                            onRecordAttempt(ok);
                            if (ok) {
                              soundFX.playSuccess();
                              setCoordTestResults((prev) => ({
                                ...prev,
                                [idx]: true,
                              }));
                              setCoordTestFeedback(null);
                            } else {
                              soundFX.playError();
                              setCoordTestFeedback(
                                `Substitusi (${tp.point.x},${tp.point.y}): ${tp.point.x} + ${tp.point.y} = ${
                                  tp.point.x + tp.point.y
                                }. Apakah memenuhi ≤ 8?`
                              );
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-[#3A1B1E] hover:bg-[#4F2327] border border-[#C94A38]/50 text-[#FFC2BA] cursor-pointer"
                        >
                          Tidak
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {coordTestFeedback && (
                <div className="p-2.5 rounded bg-[#36181A] border border-[#C94A38]/60 text-xs text-[#FFC2BA]">
                  {coordTestFeedback}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Graph Corner & Intersection Stage (Mission 6 & 7) */}
        {mission.graphStage && (
          <section className="bg-[#102033] border border-[#253F5C] rounded-xl p-5 space-y-4">
            <h2 className="font-display text-base font-bold text-[#F4C456]">
              {mission.graphStage.title}
            </h2>
            <p className="text-xs text-[#C8D4E3] leading-relaxed">
              {mission.graphStage.scenario}
            </p>

            {mission.graphStage.intersectionStep && (
              <form
                onSubmit={handleCheckIntersectionM7}
                className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3.5 space-y-2.5"
              >
                <div className="text-xs font-medium text-[#F4EBD9]">
                  1. Cari titik potong{' '}
                  <span className="font-math text-[#2A9D8F]">
                    {mission.graphStage.intersectionStep.eq1}
                  </span>{' '}
                  dan{' '}
                  <span className="font-math text-[#D49A2A]">
                    {mission.graphStage.intersectionStep.eq2}
                  </span>
                  :
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="m7-ix" className="text-xs font-math text-[#9FB0C4]">
                    x =
                  </label>
                  <input
                    id="m7-ix"
                    type="number"
                    value={intersectionInputX}
                    onChange={(e) => setIntersectionInputX(e.target.value)}
                    className="w-16 rounded bg-[#102033] border border-[#2C4766] px-2 py-1 text-sm font-math text-[#F4EBD9]"
                  />
                  <label htmlFor="m7-iy" className="text-xs font-math text-[#9FB0C4]">
                    y =
                  </label>
                  <input
                    id="m7-iy"
                    type="number"
                    value={intersectionInputY}
                    onChange={(e) => setIntersectionInputY(e.target.value)}
                    className="w-16 rounded bg-[#102033] border border-[#2C4766] px-2 py-1 text-sm font-math text-[#F4EBD9]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-[#D49A2A] hover:bg-[#E0AA3E] text-[#0B1726] font-semibold text-xs cursor-pointer"
                  >
                    Cek
                  </button>
                </div>
                {intersectionSolved && (
                  <div className="text-xs text-[#9CF0E4]">
                    Benar! Titik potongnya adalah (2, 6).
                  </div>
                )}
                {intersectionError && (
                  <div className="text-xs text-[#FFC2BA]">{intersectionError}</div>
                )}
              </form>
            )}

            {mission.graphStage.requireCornerSelection && (
              <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#F4EBD9]">
                    2. Tandai ke-4 titik pojok pada grafik di sebelah kiri:
                  </span>
                  <span className="font-math font-bold text-[#D49A2A] tabular-nums">
                    {selectedCorners.length} / 4
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCorners.map((c) => (
                    <span
                      key={`${c.x},${c.y}`}
                      className="font-math text-xs px-2 py-0.5 rounded bg-[#123332] border border-[#2A9D8F]/60 text-[#9CF0E4]"
                    >
                      ({c.x}, {c.y})
                    </span>
                  ))}
                  {selectedCorners.length === 0 && (
                    <span className="text-xs text-[#8FA4BC]">
                      Belum ada titik pojok dipilih.
                    </span>
                  )}
                </div>
                {cornerNotice && (
                  <div className="p-2.5 rounded bg-[#36181A] border border-[#C94A38]/60 text-xs text-[#FFC2BA]">
                    {cornerNotice}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Optimization Stage (Missions 9, 10, 11, 12) */}
        {mission.optimizationStage && (
          <section className="bg-[#102033] border border-[#253F5C] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-[#F4C456]">
                {mission.optimizationStage.title}
              </h2>
              {mission.optimizationStage.independentMode && (
                <span className="text-[11px] font-semibold text-[#FFC2BA] flex items-center gap-1 whitespace-nowrap shrink-0">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Tanpa Petunjuk
                </span>
              )}
            </div>
            <p className="text-xs text-[#C8D4E3] leading-relaxed">
              {mission.optimizationStage.scenario}
            </p>

            {/* Step 1 for Missions 11 & 12: Model Builder */}
            {mission.optimizationStage.buildModelFirst && (
              <form
                onSubmit={handleVerifyOptModel}
                className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F4EBD9]">
                    Tahap 1 — Susun Model Matematika
                  </span>
                  {modelVerified && (
                    <CheckCircle2 className="w-4 h-4 text-[#2A9D8F]" aria-hidden="true" />
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <label htmlFor="opt-c1" className="block text-[11px] text-[#9FB0C4] mb-1">
                      Pertidaksamaan Batas 1 (dengan ≤)
                    </label>
                    <input
                      id="opt-c1"
                      type="text"
                      disabled={modelVerified}
                      value={modelConstraintInputs[0]}
                      onChange={(e) =>
                        setModelConstraintInputs([e.target.value, modelConstraintInputs[1]])
                      }
                      placeholder={
                        mission.optimizationStage.independentMode
                          ? 'Contoh format: ax + by <= c'
                          : 'Contoh: 2x + y <= 20'
                      }
                      className="w-full rounded bg-[#102033] border border-[#2C4766] px-3 py-1.5 text-sm font-math text-[#F4EBD9] disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label htmlFor="opt-c2" className="block text-[11px] text-[#9FB0C4] mb-1">
                      Pertidaksamaan Batas 2 (dengan ≤)
                    </label>
                    <input
                      id="opt-c2"
                      type="text"
                      disabled={modelVerified}
                      value={modelConstraintInputs[1]}
                      onChange={(e) =>
                        setModelConstraintInputs([modelConstraintInputs[0], e.target.value])
                      }
                      placeholder={
                        mission.optimizationStage.independentMode
                          ? 'Contoh format: ax + by <= c'
                          : 'Contoh: x + 2y <= 16'
                      }
                      className="w-full rounded bg-[#102033] border border-[#2C4766] px-3 py-1.5 text-sm font-math text-[#F4EBD9] disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label htmlFor="opt-obj" className="block text-[11px] text-[#9FB0C4] mb-1">
                      Fungsi Objektif Z
                    </label>
                    <input
                      id="opt-obj"
                      type="text"
                      disabled={modelVerified}
                      value={modelObjInput}
                      onChange={(e) => setModelObjInput(e.target.value)}
                      placeholder={
                        mission.optimizationStage.independentMode
                          ? 'Contoh format: px + qy'
                          : 'Contoh: 3x + 5y'
                      }
                      className="w-full rounded bg-[#102033] border border-[#2C4766] px-3 py-1.5 text-sm font-math text-[#F4EBD9] disabled:opacity-60"
                    />
                  </div>
                </div>

                {!modelVerified && (
                  <button
                    type="submit"
                    className="w-full px-4 py-2 rounded-lg bg-[#D49A2A] hover:bg-[#E0AA3E] text-[#0B1726] font-semibold text-xs cursor-pointer"
                  >
                    Verifikasi Model Matematika
                  </button>
                )}

                {modelError && (
                  <div className="p-2.5 rounded bg-[#36181A] border border-[#C94A38]/60 text-xs text-[#FFC2BA]">
                    {modelError}
                  </div>
                )}
              </form>
            )}

            {/* Step 2 & 3: Corner Points Evaluation + Optimal Selection */}
            {modelVerified && (
              <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-4 space-y-3">
                <div className="text-xs font-bold text-[#F4EBD9]">
                  {mission.optimizationStage.buildModelFirst
                    ? 'Tahap 2 & 3 — Uji Titik Pojok & Pilih Hasil Optimal'
                    : `Hitung & Pilih Titik dengan Nilai ${
                        mission.optimizationStage.objective.goal === 'max'
                          ? 'Maksimum'
                          : 'Minimum'
                      }`}
                </div>

                <div className="space-y-2">
                  {mission.optimizationStage.expectedCorners.map((pt, idx) => {
                    const key = `${pt.x},${pt.y}`;
                    const verified = Boolean(cornerZVerified[key]);
                    const val = evaluateObjective(pt, mission.optimizationStage!.objective);
                    const isPicked = chosenOptimalIdx === idx && optimalSolved;

                    return (
                      <div
                        key={key}
                        className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#102033] border border-[#223954] text-xs"
                      >
                        <div className="font-math font-bold text-[#F4EBD9]">
                          Titik ({pt.x}, {pt.y})
                        </div>

                        {!verified ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-math text-[#9FB0C4]">Z =</span>
                            <input
                              type="number"
                              aria-label={`Nilai Z untuk titik (${pt.x}, ${pt.y})`}
                              value={cornerZInputs[key] || ''}
                              onChange={(e) =>
                                setCornerZInputs((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              className="w-16 rounded bg-[#0B1726] border border-[#2C4766] px-2 py-1 font-math text-[#F4EBD9]"
                            />
                            <button
                              type="button"
                              onClick={() => handleCheckCornerZ(pt)}
                              className="px-2.5 py-1 rounded bg-[#152B44] hover:bg-[#1D3856] border border-[#D49A2A]/50 text-[#F4C456] font-medium cursor-pointer"
                            >
                              Hitung
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-math text-[#9CF0E4] font-bold tabular-nums">
                              Z = {val} {mission.optimizationStage?.unitLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleChooseOptimalCorner(idx)}
                              className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                                isPicked
                                  ? 'bg-[#2A9D8F] text-[#0B1726]'
                                  : 'bg-[#D49A2A] hover:bg-[#E0AA3E] text-[#0B1726]'
                              }`}
                            >
                              {isPicked
                                ? 'Optimal Dipilih'
                                : mission.optimizationStage?.objective.goal === 'max'
                                ? 'Pilih Maksimum'
                                : 'Pilih Minimum'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {cornerZError && (
                  <div className="p-2.5 rounded bg-[#36181A] border border-[#C94A38]/60 text-xs text-[#FFC2BA]">
                    {cornerZError}
                  </div>
                )}
                {optimalError && (
                  <div className="p-2.5 rounded bg-[#36181A] border border-[#C94A38]/60 text-xs text-[#FFC2BA]">
                    {optimalError}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Mission Complete / Knowledge Unlocked Panel */}
        {isMissionComplete ? (
          <section className="bg-[#112B2D] border border-[#2A9D8F] rounded-xl p-5 space-y-4 shadow-lg">
            <div className="flex items-start gap-3">
              <Award className="w-6 h-6 text-[#F4C456] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-[#9CF0E4]">
                  Knowledge Unlocked
                </div>
                <p className="text-sm text-[#F4EBD9] leading-relaxed">
                  {mission.knowledgeUnlocked}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playVictory();
                onCompleteMission(mission.id, alreadyCompleted ? 0 : mission.rewardCoins);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#D49A2A] hover:bg-[#E0AA3E] text-[#0B1726] font-bold text-sm transition-colors cursor-pointer"
            >
              {mission.id === 12 ? (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  Tumbangkan Raja Aurelius & Lihat Kemenangan
                </>
              ) : (
                <>
                  Lanjut ke Misi {mission.id + 1}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </section>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[#0D1A2B] border border-[#1E354E] text-xs text-[#8FA4BC]">
            <Compass className="w-4 h-4 text-[#D49A2A] shrink-0" aria-hidden="true" />
            <span>
              {mission.id === 12
                ? 'Selesaikan seluruh tantangan akhir untuk menumbangkan Raja Aurelius!'
                : 'Selesaikan seluruh tantangan pada misi ini untuk membuka misi berikutnya.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
