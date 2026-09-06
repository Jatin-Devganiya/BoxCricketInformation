import React, { useEffect, useState, useRef } from 'react';
import { CelebrationEvent } from '../utils/cricketCelebrations';
import { playCelebrationSound, isSoundEnabled, setSoundEnabled } from '../utils/celebrationAudio';
import { Volume2, VolumeX, X, Trophy, Sparkles, Award } from 'lucide-react';

interface LiveScoringCelebrationProps {
  event: CelebrationEvent | null;
  onComplete: () => void;
}

export const LiveScoringCelebration: React.FC<LiveScoringCelebrationProps> = ({
  event,
  onComplete,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!event) return;

    // Trigger synthesized audio
    playCelebrationSound(event.type);

    // Auto-complete after event.durationMs
    const timer = setTimeout(() => {
      onComplete();
    }, event.durationMs || 2500);

    return () => clearTimeout(timer);
  }, [event, onComplete]);

  // Canvas-based lightweight particle celebration effects
  useEffect(() => {
    if (!event || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors =
      event.type === 'HAT_TRICK'
        ? ['#ec4899', '#f43f5e', '#8b5cf6', '#fbbf24', '#ffffff']
        : event.type === 'WICKET'
        ? ['#ef4444', '#f87171', '#f59e0b', '#dc2626', '#ffffff']
        : event.type === 'FIFTY'
        ? ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#10b981']
        : event.type === 'CENTURY' || event.type === 'MILESTONE'
        ? ['#fbbf24', '#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ffffff']
        : event.type === 'SIX'
        ? ['#10b981', '#34d399', '#3b82f6', '#f59e0b', '#ffffff']
        : ['#10b981', '#34d399', '#6ee7b7', '#38bdf8', '#ffffff'];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRotation: number;
      alpha: number;
      decay: number;
    }

    const particles: Particle[] = [];
    const particleCount =
      event.type === 'HAT_TRICK' || event.type === 'CENTURY' || event.type === 'MILESTONE' ? 85 : 55;

    // Spurt from center or bottom
    const originX = canvas.width / 2;
    const originY = event.type === 'SIX' ? canvas.height * 0.65 : canvas.height * 0.5;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5);
      const speed = Math.random() * 8 + 3;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (event.type === 'SIX' ? 5 : 2),
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRotation: (Math.random() - 0.5) * 10,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.01,
      });
    }

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16; // gravity
        p.rotation += p.vRotation;
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [event]);

  if (!event) return null;

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const isMilestone = event.type === 'FIFTY' || event.type === 'CENTURY' || event.type === 'MILESTONE';

  return (
    <div
      className={`celebration-overlay celebration-type-${event.type.toLowerCase()}`}
      onClick={onComplete}
      title="Click anywhere to continue scoring"
      role="dialog"
      aria-modal="true"
    >
      {/* Background Particle Canvas */}
      <canvas ref={canvasRef} className="celebration-canvas" />

      {/* Main Celebration Banner Card */}
      <div
        className="celebration-card"
        onClick={(e) => e.stopPropagation()} // Card clicks won't accidentally close prematurely unless user clicks dismiss
      >
        {/* Top Control Actions: Sound toggle & Quick close */}
        <div className="celebration-controls">
          <button
            type="button"
            className="celebration-ctrl-btn"
            onClick={toggleSound}
            title={soundOn ? 'Mute Celebration Sound' : 'Enable Celebration Sound'}
            aria-label="Toggle Sound"
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            type="button"
            className="celebration-ctrl-btn"
            onClick={onComplete}
            title="Continue live scoring immediately"
            aria-label="Close celebration"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. SIX CELEBRATION */}
        {event.type === 'SIX' && (
          <div className="celebration-content">
            <div className="celebration-visual-box">
              {/* Flying cricket ball animation */}
              <div className="ball-flight-track">
                <div className="cricket-ball animated-six-ball">
                  <div className="ball-seam" />
                </div>
                <div className="flight-trail" />
              </div>
            </div>

            <div className="celebration-badge-row">
              <span className="celebration-pill pill-six">+6 RUNS</span>
            </div>

            <h1 className="celebration-title title-six">SIX!</h1>

            <div className="celebration-player-name">{event.playerName}</div>

            <p className="celebration-subtitle">{event.subtitle || 'Massive Six!'}</p>
          </div>
        )}

        {/* 2. FOUR CELEBRATION */}
        {event.type === 'FOUR' && (
          <div className="celebration-content">
            <div className="celebration-visual-box">
              {/* Cricket ball zipping along boundary grass */}
              <div className="ball-boundary-track">
                <div className="cricket-ball animated-four-ball">
                  <div className="ball-seam" />
                </div>
                <div className="boundary-rope" />
              </div>
            </div>

            <div className="celebration-badge-row">
              <span className="celebration-pill pill-four">+4 RUNS</span>
            </div>

            <h1 className="celebration-title title-four">FOUR!</h1>

            <div className="celebration-player-name">{event.playerName}</div>

            <p className="celebration-subtitle">{event.subtitle || 'Boundary!'}</p>
          </div>
        )}

        {/* 3. WICKET CELEBRATION */}
        {event.type === 'WICKET' && (
          <div className="celebration-content">
            <div className="celebration-visual-box">
              {/* Cricket Stumps getting struck & toppling animation */}
              <div className="stumps-container">
                <div className="bail bail-left" />
                <div className="bail bail-right" />
                <div className="stump stump-1" />
                <div className="stump stump-2" />
                <div className="stump stump-3" />
                <div className="stump-impact-flash" />
              </div>
            </div>

            <div className="celebration-badge-row">
              <span className="celebration-pill pill-wicket">
                {event.wicketType ? event.wicketType.toUpperCase() : 'OUT'}
              </span>
            </div>

            <h1 className="celebration-title title-wicket">WICKET!</h1>

            <div className="celebration-player-name">{event.playerName}</div>

            <p className="celebration-subtitle">
              {event.wicketType ? `${event.wicketType}` : 'Batsman Dismissed'}
            </p>
          </div>
        )}

        {/* 4. FIFTY / CENTURY / MILESTONE CELEBRATIONS */}
        {isMilestone && (
          <div className="celebration-content">
            <div className="celebration-visual-box">
              <div className="milestone-trophy-wrap">
                <div className="milestone-halo" />
                {event.type === 'FIFTY' ? (
                  <Sparkles size={56} className="milestone-icon icon-fifty" />
                ) : event.type === 'CENTURY' ? (
                  <Trophy size={60} className="milestone-icon icon-century" />
                ) : (
                  <Award size={60} className="milestone-icon icon-milestone" />
                )}
              </div>
            </div>

            <div className="celebration-badge-row">
              <span className="celebration-pill pill-milestone">
                {event.milestone || event.runs} RUNS
              </span>
            </div>

            <h1 className="celebration-title title-milestone">
              {event.type === 'FIFTY'
                ? 'FIFTY!'
                : event.type === 'CENTURY'
                ? 'CENTURY!'
                : `${event.milestone || event.runs}!`}
            </h1>

            <div className="celebration-player-name">{event.playerName}</div>

            <p className="celebration-subtitle">
              {event.subtitle ||
                (event.type === 'FIFTY'
                  ? 'Half Century!'
                  : event.type === 'CENTURY'
                  ? 'What a Century!'
                  : 'Incredible Innings!')}
            </p>
          </div>
        )}

        {/* 5. HAT-TRICK CELEBRATION */}
        {event.type === 'HAT_TRICK' && (
          <div className="celebration-content">
            <div className="celebration-visual-box">
              <div className="milestone-trophy-wrap">
                <div
                  className="milestone-halo"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(236,72,153,0.45) 0%, rgba(139,92,246,0.2) 50%, transparent 70%)',
                  }}
                />
                <div style={{ fontSize: '3.6rem', filter: 'drop-shadow(0 0 16px rgba(236,72,153,0.7))' }}>
                  🎩⚡🔥
                </div>
              </div>
            </div>

            <div className="celebration-badge-row">
              <span
                className="celebration-pill pill-hattrick"
                style={{
                  background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                  color: '#ffffff',
                  border: '1px solid #f472b6',
                  boxShadow: '0 0 16px rgba(236,72,153,0.5)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                🔥 HAT-TRICK! 🔥
              </span>
            </div>

            <h1
              className="celebration-title title-hattrick"
              style={{
                color: '#f43f5e',
                textShadow: '0 0 24px rgba(244,63,94,0.7)',
                fontSize: '2.6rem',
                letterSpacing: '0.05em',
              }}
            >
              HAT-TRICK!
            </h1>

            <div className="celebration-player-name">{event.playerName}</div>

            <p className="celebration-subtitle">
              {event.subtitle || '3 Wickets in 3 Consecutive Balls!'}
            </p>
          </div>
        )}

        {/* Footer Dismiss / Continue prompt */}
        <div className="celebration-footer">
          <button
            type="button"
            className="btn btn-sm btn-secondary celebration-dismiss-btn"
            onClick={onComplete}
          >
            Tap anywhere to continue
          </button>
        </div>
      </div>
    </div>
  );
};
