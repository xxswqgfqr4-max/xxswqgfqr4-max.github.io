(() => {
    const canvas = document.querySelector('.numerals');
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;

    const SUPER = 2;
    const MAX_RES = 4;
    const FOCAL = 1.3;
    const ANGLE = (36 * Math.PI) / 180;
    const TILT = (8 * Math.PI) / 180;
    const LIFT = 48;
    const GROW = FOCAL / (FOCAL - 0.5 * Math.sin(ANGLE));

    const still = matchMedia('(prefers-reduced-motion: reduce)');
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#000';
    const font = getComputedStyle(document.body).fontFamily;
    const nums = [...document.querySelectorAll('.num')].map((slot) => ({
        slot,
        key: '',
        side: Number(getComputedStyle(slot).getPropertyValue('--side')) || 1,
    }));
    let dpr = 1;
    let queued = false;

    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const ease = (t) => 1 - (1 - t) ** 3;

    /* ── Sprite ── */

    function build(n, r) {
        const key = `${r.width}x${r.height}x${dpr}`;
        if (n.key === key) return;
        n.key = key;
        n.pose = -1;
        n.res = Math.min(dpr * SUPER, MAX_RES);

        const text = n.slot.dataset.num;
        const img = n.img || (n.img = document.createElement('canvas'));
        const g = img.getContext('2d');

        g.font = `800 100px ${font}`;
        const m = g.measureText(text);
        const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
        const th = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        const h = th * GROW;
        const cos = Math.cos(TILT);
        const sin = Math.sin(TILT);
        const k = Math.min(r.width / (w * cos + h * sin), r.height / (w * sin + h * cos)) * n.res;

        img.width = Math.ceil(w * k) + 4;
        img.height = Math.ceil(th * k) + 4;
        g.font = `800 ${100 * k}px ${font}`;
        g.fillStyle = ink;
        g.fillText(text, m.actualBoundingBoxLeft * k + 2, m.actualBoundingBoxAscent * k + 2);

        n.plane = n.plane || document.createElement('canvas');
        n.plane.width = img.width;
        n.plane.height = Math.ceil(img.height * GROW) + 2;
        n.pctx = n.plane.getContext('2d');
    }

    /* ── Perspective ── */

    function project(n, angle) {
        if (n.pose === angle) return;
        n.pose = angle;

        const { img, plane, pctx: p, side } = n;
        const W = img.width;
        const H = img.height;
        const f = W * FOCAL;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const ox = plane.width / 2;
        const oy = plane.height / 2;
        const scale = (x) => f / (f + side * x * sin);

        p.clearRect(0, 0, plane.width, plane.height);
        let x0 = -W / 2;
        let s0 = scale(x0);
        for (let c = 0; c < W; c++) {
            const x1 = x0 + 1;
            const s1 = scale(x1);
            const h = (H * (s0 + s1)) / 2;
            const dx = ox + x0 * cos * s0;
            p.drawImage(img, c, 0, 1, H, dx, oy - h / 2, ox + x1 * cos * s1 - dx + 1, h);
            x0 = x1;
            s0 = s1;
        }
    }

    /* ── Frame ── */

    function draw() {
        queued = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingQuality = 'high';

        const vh = innerHeight;
        nums.forEach((n) => {
            const r = n.slot.getBoundingClientRect();
            if (r.bottom < -r.height / 2 || r.top > vh + r.height / 2) return;

            const t = still.matches ? 1 : ease(clamp01((vh - r.top) / (vh * 0.55)));
            if (t <= 0) return;

            build(n, r);
            project(n, (ANGLE * Math.round(t * 64)) / 64);

            const w = n.img.width / n.res;
            const cx = n.side > 0 ? r.left + w / 2 : r.right - w / 2;
            const cy = r.top + r.height / 2 + (1 - t) * LIFT;
            const pw = n.plane.width / n.res;
            const ph = n.plane.height / n.res;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.translate(cx, cy);
            ctx.rotate(-n.side * TILT * t);
            ctx.globalAlpha = clamp01(t * 2);
            ctx.drawImage(n.plane, -pw / 2, -ph / 2, pw, ph);
        });
    }

    function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(draw);
    }

    function resize() {
        dpr = Math.min(devicePixelRatio || 1, 3);
        const w = Math.round(innerWidth * dpr);
        const h = Math.round(innerHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        schedule();
    }

    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', resize);
    still.addEventListener('change', schedule);
    new ResizeObserver(schedule).observe(document.querySelector('main'));
    document.fonts.load(`800 100px ${font}`).then(() => {
        nums.forEach((n) => (n.key = ''));
        schedule();
    });
    resize();
})();
