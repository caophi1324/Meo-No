// Imported only by the review runner, never by the production application.
export async function capture(name, gap = 2300) {
  const review = window.animationReview;
  const engine = review.soundEffects;
  window.captureStage = 'unlock';
  engine.muted = false; engine.init(); await engine.ctx.resume();
  const ctx = engine.ctx;
  const destination = ctx.createMediaStreamDestination();
  const original = AudioNode.prototype.connect;
  // Tee exactly the live procedural audio routed to the speakers.
  AudioNode.prototype.connect = function(target, ...args) {
    const result = original.call(this, target, ...args);
    if (target === ctx.destination) original.call(this, destination);
    return result;
  };
  const chunks = [];
  const recorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus' });
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise(resolve => { recorder.onstop = resolve; });
  const samples = review.frames(gap * 3);
  recorder.start(); window.captureStage = 'recording';
  try { await review.sequence(gap); }
  finally { recorder.stop(); AudioNode.prototype.connect = original; window.captureStage = 'waiting-recorder'; }
  await stopped;
  window.captureStage = 'upload';
  const audio = new Blob(chunks, { type: 'audio/webm' });
  await fetch(`http://127.0.0.1:4190/${name}-audio.webm`, { method: 'POST', body: audio });
  window.captureStage = 'frames';
  const metrics = { ...await samples, audioBytes: audio.size, audioState: ctx.state, width: innerWidth, height: innerHeight,
    active: review.store.getState().cardEffect?.effectId || null,
    queued: review.store.getState().effectQueue?.length,
    receipts: review.store.getState().playedPresentations,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  };
  await fetch(`http://127.0.0.1:4190/${name}-metrics.json`, { method: 'POST', body: JSON.stringify(metrics, null, 2) });
  destination.stream.getTracks().forEach(t => t.stop());
  window.captureStage = 'done';
  return metrics;
}
