(() => {
    const viewer = document.querySelector('.viewer');
    if (!viewer) return;

    const shown = viewer.querySelector('img');
    let pressedOutside = false;

    document.querySelectorAll('.zoom').forEach((button) => {
        button.addEventListener('click', () => {
            shown.src = button.querySelector('img').currentSrc;
            viewer.showModal();
        });
    });

    viewer.addEventListener('pointerdown', (e) => {
        pressedOutside = e.target === viewer;
    });

    viewer.addEventListener('click', (e) => {
        if (pressedOutside && e.target === viewer) viewer.close();
        pressedOutside = false;
    });
})();
