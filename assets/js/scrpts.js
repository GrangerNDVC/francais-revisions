function setupQuiz(questions) {
    let currentQ = 0;
    let score = 0;
    let conseils = [];

    const displayQ = () => {
        const q = questions[currentQ];
        const container = document.getElementById('quiz-container'); // Assure-toi d'avoir cet ID
        if(!container) return;

        container.innerHTML = `
            <div class="card">
                <h4>Question ${currentQ + 1}/20</h4>
                <p style="font-size:1.2rem; margin:20px 0;">${q.q}</p>
                <div class="options-grid" style="display:grid; gap:10px;">
                    ${q.options.map((o, i) => `<button class="btn-outline" onclick="check(${i})">${o}</button>`).join('')}
                </div>
            </div>
        `;
    };

    window.check = (i) => {
        if(i === questions[currentQ].correct) score++;
        else conseils.push(questions[currentQ].conseil);
        
        currentQ++;
        if(currentQ < questions.length) displayQ();
        else showFinal();
    };

    const showFinal = () => {
        const container = document.getElementById('quiz-container');
        container.innerHTML = `
            <div class="card" style="text-align:center;">
                <h2>Résultat : ${score}/20</h2>
                <p>${score >= 16 ? "Excellent !" : "Continue tes efforts !"}</p>
                <div style="text-align:left; background:#f8f9fa; padding:15px; border-radius:10px; margin-top:20px;">
                    <strong>Tes points à travailler :</strong>
                    <ul>${[...new Set(conseils)].map(c => `<li>${c}</li>`).join('')}</ul>
                </div>
                <button class="btn-primary" onclick="location.reload()" style="margin-top:20px;">Recommencer</button>
            </div>
        `;
    };
    displayQ();
}
function setupQuiz(questions) {
    let currentQ = 0;
    let score = 0;
    let conseils = [];

    const displayQ = () => {
        const q = questions[currentQ];
        const container = document.getElementById('quiz-container'); // Assure-toi d'avoir cet ID
        if(!container) return;

        container.innerHTML = `
            <div class="card">
                <h4>Question ${currentQ + 1}/20</h4>
                <p style="font-size:1.2rem; margin:20px 0;">${q.q}</p>
                <div class="options-grid" style="display:grid; gap:10px;">
                    ${q.options.map((o, i) => `<button class="btn-outline" onclick="check(${i})">${o}</button>`).join('')}
                </div>
            </div>
        `;
    };

    window.check = (i) => {
        if(i === questions[currentQ].correct) score++;
        else conseils.push(questions[currentQ].conseil);
        
        currentQ++;
        if(currentQ < questions.length) displayQ();
        else showFinal();
    };

    const showFinal = () => {
        const container = document.getElementById('quiz-container');
        container.innerHTML = `
            <div class="card" style="text-align:center;">
                <h2>Résultat : ${score}/20</h2>
                <p>${score >= 16 ? "Excellent !" : "Continue tes efforts !"}</p>
                <div style="text-align:left; background:#f8f9fa; padding:15px; border-radius:10px; margin-top:20px;">
                    <strong>Tes points à travailler :</strong>
                    <ul>${[...new Set(conseils)].map(c => `<li>${c}</li>`).join('')}</ul>
                </div>
                <button class="btn-primary" onclick="location.reload()" style="margin-top:20px;">Recommencer</button>
            </div>
        `;
    };
    displayQ();
}