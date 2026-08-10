class QuizSystem {
    constructor() {
        this.currentQuiz = null;
        this.userAnswers = [];
        this.score = 0;
        this.startTime = null;
    }

    // Charger un quiz pour une leçon
    async loadQuiz(lessonId) {
        try {
            const response = await fetch('../assets/data/quiz.json');
            const data = await response.json();
            
            // Filtrer les questions pour cette leçon
            const lessonQuestions = data.questions.filter(q => q.lesson_id === lessonId);
            
            if (lessonQuestions.length === 0) {
                this.showNoQuizMessage();
                return;
            }
            
            this.currentQuiz = {
                lessonId: lessonId,
                questions: lessonQuestions,
                totalQuestions: lessonQuestions.length,
                maxScore: lessonQuestions.reduce((sum, q) => sum + q.points, 0)
            };
            
            this.renderQuiz();
            
        } catch (error) {
            console.error('Erreur de chargement du quiz:', error);
        }
    }

    // Afficher le quiz
    renderQuiz() {
        const container = document.getElementById('quiz-container');
        const resultsContainer = document.getElementById('quiz-results');
        
        // Cacher les résultats précédents
        resultsContainer.style.display = 'none';
        
        // Afficher le container de quiz
        const quizSection = document.getElementById('quiz-section');
        quizSection.style.display = 'block';
        
        let html = `
            <h1><i class="fas fa-question-circle"></i> Quiz : ${contentLoader.lessonData.title}</h1>
            <div class="quiz-info">
                <p><i class="fas fa-list-ol"></i> ${this.currentQuiz.totalQuestions} questions</p>
                <p><i class="fas fa-star"></i> Score maximum : ${this.currentQuiz.maxScore} points</p>
            </div>
            <div id="questions-container">
        `;
        
        // Afficher chaque question
        this.currentQuiz.questions.forEach((question, index) => {
            html += this.renderQuestion(question, index);
        });
        
        html += `
            </div>
            <button class="btn btn-accent" onclick="quizSystem.submitQuiz()" style="margin-top: 30px;">
                <i class="fas fa-paper-plane"></i> Valider le quiz
            </button>
        `;
        
        container.innerHTML = html;
        this.startTime = new Date();
    }

    // Afficher une question
    renderQuestion(question, index) {
        let html = `
            <div class="quiz-question" data-question-id="${question.id}">
                <h3>Question ${index + 1}</h3>
                <p class="question-text">${question.question}</p>
        `;
        
        switch(question.type) {
            case 'multiple_choice':
                html += this.renderMultipleChoice(question, index);
                break;
                
            case 'fill_blank':
                html += this.renderFillBlank(question, index);
                break;
                
            case 'true_false':
                html += this.renderTrueFalse(question, index);
                break;
        }
        
        // Afficher un indice si disponible
        if (question.hint) {
            html += `
                <div class="quiz-hint" style="display: none;" id="hint-${index}">
                    <i class="fas fa-lightbulb"></i> <em>${question.hint}</em>
                </div>
                <button class="btn btn-secondary" onclick="toggleHint(${index})" style="margin-top: 10px;">
                    <i class="fas fa-question"></i> Afficher un indice
                </button>
            `;
        }
        
        html += `</div><hr>`;
        return html;
    }

    // Question à choix multiple
    renderMultipleChoice(question, index) {
        let html = '<div class="quiz-options">';
        
        question.options.forEach((option, optionIndex) => {
            html += `
                <label class="quiz-option">
                    <input type="radio" name="question-${index}" value="${optionIndex}">
                    <span>${option}</span>
                </label>
            `;
        });
        
        html += '</div>';
        return html;
    }

    // Question à trous
    renderFillBlank(question, index) {
        return `
            <div class="quiz-fill-blank">
                <input type="text" 
                       class="quiz-input" 
                       placeholder="Votre réponse..." 
                       data-question-index="${index}">
                <small>Appuyez sur Entrée pour valider</small>
            </div>
        `;
    }

    // Soumettre le quiz
    submitQuiz() {
        this.userAnswers = [];
        this.score = 0;
        
        // Collecter les réponses
        this.currentQuiz.questions.forEach((question, index) => {
            const answer = this.collectAnswer(question, index);
            this.userAnswers.push(answer);
            
            // Vérifier si la réponse est correcte
            if (this.isAnswerCorrect(question, answer)) {
                this.score += question.points;
            }
        });
        
        // Calculer le pourcentage
        const percentage = (this.score / this.currentQuiz.maxScore) * 100;
        
        // Afficher les résultats
        this.showResults(percentage);
        
        // Sauvegarder les résultats
        this.saveQuizResults(percentage);
        
        // Générer des recommandations
        this.generateRecommendations();
    }

    // Vérifier si une réponse est correcte
    isAnswerCorrect(question, userAnswer) {
        switch(question.type) {
            case 'multiple_choice':
                return parseInt(userAnswer) === question.correct_answer;
                
            case 'fill_blank':
                return userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
                
            case 'true_false':
                return userAnswer === question.correct_answer;
                
            default:
                return false;
        }
    }

    // Afficher les résultats
    showResults(percentage) {
        const container = document.getElementById('quiz-results');
        const questionsContainer = document.getElementById('questions-container');
        
        // Cacher les questions
        questionsContainer.style.display = 'none';
        
        // Afficher les résultats
        container.style.display = 'block';
        
        let feedback = '';
        let icon = '';
        let color = '';
        
        if (percentage >= 80) {
            feedback = 'Excellent ! Tu as bien compris la leçon.';
            icon = 'fas fa-trophy';
            color = 'var(--success)';
        } else if (percentage >= 60) {
            feedback = 'Bien ! Quelques révisions seraient utiles.';
            icon = 'fas fa-thumbs-up';
            color = 'var(--warning)';
        } else {
            feedback = 'Il faut revoir cette leçon.';
            icon = 'fas fa-redo';
            color = 'var(--danger)';
        }
        
        container.innerHTML = `
            <div class="quiz-results-card" style="text-align: center; padding: 30px;">
                <i class="${icon}" style="font-size: 4rem; color: ${color}; margin-bottom: 20px;"></i>
                <h2>Résultats du quiz</h2>
                <div class="score-circle" style="
                    width: 150px; 
                    height: 150px; 
                    border-radius: 50%; 
                    background: conic-gradient(${color} ${percentage}%, #eee ${percentage}%);
                    margin: 30px auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                ">
                    <div style="
                        width: 120px; 
                        height: 120px; 
                        background: white; 
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 2rem;
                        font-weight: bold;
                    ">
                        ${Math.round(percentage)}%
                    </div>
                </div>
                
                <p style="font-size: 1.2rem; margin: 20px 0;">${feedback}</p>
                
                <div class="quiz-details">
                    <p><strong>Score :</strong> ${this.score}/${this.currentQuiz.maxScore} points</p>
                    <p><strong>Temps :</strong> ${this.getElapsedTime()} secondes</p>
                </div>
                
                <div class="quiz-actions" style="margin-top: 30px;">
                    <button class="btn btn-primary" onclick="quizSystem.showCorrections()">
                        <i class="fas fa-check-circle"></i> Voir les corrections
                    </button>
                    <button class="btn btn-secondary" onclick="quizSystem.restartQuiz()">
                        <i class="fas fa-redo"></i> Recommencer
                    </button>
                </div>
            </div>
        `;
    }

    // Afficher les corrections
    showCorrections() {
        const container = document.getElementById('quiz-results');
        
        let html = '<h2><i class="fas fa-check-circle"></i> Corrections</h2>';
        
        this.currentQuiz.questions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            const isCorrect = this.isAnswerCorrect(question, userAnswer);
            
            html += `
                <div class="correction-item" style="
                    margin: 20px 0; 
                    padding: 20px; 
                    background: ${isCorrect ? '#e8f5e9' : '#ffebee'};
                    border-radius: var(--border-radius);
                    border-left: 5px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'};
                ">
                    <h4>Question ${index + 1}: ${question.question}</h4>
                    <p><strong>Ta réponse :</strong> ${this.formatUserAnswer(question, userAnswer)}</p>
                    <p><strong>Réponse correcte :</strong> ${this.formatCorrectAnswer(question)}</p>
                    <p><em>${question.explanation}</em></p>
                    ${!isCorrect ? '<p class="weak-point" data-weakness="${question.keywords?.join(',') || ''}">À revoir</p>' : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Générer des recommandations personnalisées
    generateRecommendations() {
        const weaknesses = [];
        
        // Analyser les erreurs
        this.currentQuiz.questions.forEach((question, index) => {
            if (!this.isAnswerCorrect(question, this.userAnswers[index])) {
                if (question.keywords) {
                    weaknesses.push(...question.keywords);
                }
            }
        });
        
        // Créer des recommandations basées sur les faiblesses
        const recommendationsList = document.getElementById('recommendations-list');
        const recommendationsSection = document.getElementById('recommendations');
        
        if (weaknesses.length > 0) {
            recommendationsSection.style.display = 'block';
            
            const uniqueWeaknesses = [...new Set(weaknesses)];
            recommendationsList.innerHTML = uniqueWeaknesses.map(weakness => `
                <li>
                    <i class="fas fa-book"></i> 
                    Revoir : <strong>${weakness}</strong>
                    <button class="btn btn-small" onclick="focusOnWeakness('${weakness}')">
                        <i class="fas fa-search"></i> Voir
                    </button>
                </li>
            `).join('');
        }
    }

    // Sauvegarder les résultats
    saveQuizResults(percentage) {
        const userId = getCurrentUserId(); // À implémenter
        const lessonId = this.currentQuiz.lessonId;
        
        // Sauvegarder dans la base de données
        const progressData = {
            user_id: userId,
            lesson_id: lessonId,
            score: percentage,
            date: new Date().toISOString(),
            weaknesses: this.getWeaknesses()
        };
        
        // Envoyer à l'API ou sauvegarder localement
        localStorage.setItem(`quiz_${userId}_${lessonId}`, JSON.stringify(progressData));
        
        // Mettre à jour la progression globale
        updateLessonProgress(lessonId, percentage);
    }

    // Obtenir les faiblesses
    getWeaknesses() {
        const weaknesses = [];
        
        this.currentQuiz.questions.forEach((question, index) => {
            if (!this.isAnswerCorrect(question, this.userAnswers[index])) {
                weaknesses.push({
                    question_id: question.id,
                    topic: question.keywords?.[0] || 'général',
                    user_answer: this.userAnswers[index],
                    correct_answer: this.getCorrectAnswer(question)
                });
            }
        });
        
        return weaknesses;
    }

    // Obtenir le temps écoulé
    getElapsedTime() {
        if (!this.startTime) return 0;
        const endTime = new Date();
        return Math.round((endTime - this.startTime) / 1000);
    }

    // Redémarrer le quiz
    restartQuiz() {
        this.userAnswers = [];
        this.score = 0;
        this.renderQuiz();
    }

    // Message si pas de quiz disponible
    showNoQuizMessage() {
        const container = document.getElementById('quiz-container');
        container.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <i class="fas fa-info-circle" style="font-size: 3rem; color: var(--primary);"></i>
                <h2>Aucun quiz disponible</h2>
                <p>Il n'y a pas encore de quiz pour cette leçon.</p>
                <button class="btn btn-primary" onclick="switchTab('cours')">
                    <i class="fas fa-arrow-left"></i> Retour à la leçon
                </button>
            </div>
        `;
    }
}

// Fonction pour basculer les indices
function toggleHint(index) {
    const hint = document.getElementById(`hint-${index}`);
    if (hint.style.display === 'none') {
        hint.style.display = 'block';
    } else {
        hint.style.display = 'none';
    }
}

// Fonction pour se concentrer sur une faiblesse
function focusOnWeakness(weakness) {
    // Rechercher dans la leçon les parties concernant cette faiblesse
    const lessonContent = document.getElementById('cours');
    const elements = lessonContent.querySelectorAll('p, h2, h3, li');
    
    elements.forEach(element => {
        if (element.textContent.toLowerCase().includes(weakness.toLowerCase())) {
            element.scrollIntoView({ behavior: 'smooth' });
            element.style.backgroundColor = '#fff3cd';
            element.style.transition = 'background-color 0.5s';
            
            setTimeout(() => {
                element.style.backgroundColor = '';
            }, 3000);
        }
    });
    
    // Revenir à l'onglet cours
    switchTab('cours');
}

// Initialiser le système de quiz
const quizSystem = new QuizSystem();

// Fonction pour charger un quiz (accessible globalement)
function loadQuizForLesson(lessonId) {
    quizSystem.loadQuiz(lessonId);
}