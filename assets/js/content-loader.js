/**
 * CONTENT LOADER - Système de chargement modulaire amélioré
 * Charge les leçons depuis des fichiers JSON indépendants
 */

class ContentLoader {
    constructor() {
        this.lessonData = null;
        this.categoryData = null;
        this.cache = new Map(); // Cache pour éviter de recharger les mêmes fichiers
        this.basePath = '../assets/data/lessons/';
        this.quizPath = '../assets/data/quiz/';
    }

    /**
     * Charge une catégorie complète (index des leçons)
     */
    async loadCategory(categoryId) {
        try {
            // Vérifier le cache
            if (this.cache.has(`category_${categoryId}`)) {
                return this.cache.get(`category_${categoryId}`);
            }

            const response = await fetch(`${this.basePath}${categoryId}/index.json`);
            if (!response.ok) {
                throw new Error(`Catégorie ${categoryId} introuvable`);
            }
            
            const data = await response.json();
            
            // Mettre en cache
            this.cache.set(`category_${categoryId}`, data);
            this.categoryData = data;
            
            return data;
            
        } catch (error) {
            console.error('Erreur lors du chargement de la catégorie:', error);
            this.showError(`Impossible de charger la catégorie ${categoryId}`);
            return null;
        }
    }

    /**
     * Charge une leçon spécifique depuis son fichier JSON
     */
    async loadLesson(categoryId, lessonId) {
        try {
            // Afficher un loader
            this.showLoader();

            // Vérifier le cache
            const cacheKey = `lesson_${categoryId}_${lessonId}`;
            if (this.cache.has(cacheKey)) {
                this.lessonData = this.cache.get(cacheKey);
                this.renderLesson();
                this.hideLoader();
                return;
            }

            // Charger la catégorie pour obtenir le nom de fichier
            const category = await this.loadCategory(categoryId);
            if (!category) {
                throw new Error(`Catégorie ${categoryId} introuvable`);
            }

            // Trouver la leçon dans l'index
            const lessonInfo = category.lessons.find(l => l.id === lessonId);
            if (!lessonInfo) {
                throw new Error(`Leçon ${lessonId} introuvable dans ${categoryId}`);
            }

            // Charger le fichier de la leçon
            const response = await fetch(`${this.basePath}${categoryId}/${lessonInfo.file}`);
            if (!response.ok) {
                throw new Error(`Fichier de leçon introuvable: ${lessonInfo.file}`);
            }

            const lessonData = await response.json();
            
            // Mettre en cache
            this.cache.set(cacheKey, lessonData);
            this.lessonData = lessonData;
            
            // Rendre la leçon
            this.renderLesson();
            this.hideLoader();
            
            // Mettre à jour la progression
            this.trackLessonAccess(lessonId);
            
        } catch (error) {
            console.error('Erreur lors du chargement de la leçon:', error);
            this.showError(error.message);
            this.hideLoader();
        }
    }

    /**
     * Affiche la leçon dans la page
     */
    renderLesson() {
        if (!this.lessonData) return;

        // Mettre à jour le titre de la page
        document.title = `${this.lessonData.title} - Révisions Brevet`;
        
        // Créer les onglets
        this.createTabs();
        
        // Créer les différentes sections
        this.createCourseSection();
        this.createExceptionsSection();
        this.createMindmapSection();
        this.createCustomizationSection();
        this.createResourcesSection();
        this.createQuizSection();
        
        // Afficher la section Cours par défaut
        this.switchTab('cours');
        
        // Initialiser les fonctionnalités interactives
        this.initializeInteractiveElements();
    }

    /**
     * Crée les onglets de navigation
     */
    createTabs() {
        const tabsContainer = document.getElementById('lessonTabs');
        if (!tabsContainer) return;

        const tabs = [
            { id: 'cours', icon: 'fa-book-open', label: 'Leçon' },
            { id: 'exceptions', icon: 'fa-exclamation-triangle', label: 'Exceptions', show: this.lessonData.exceptions?.length > 0 },
            { id: 'carte-mentale', icon: 'fa-project-diagram', label: 'Carte mentale', show: this.lessonData.mindmap },
            { id: 'personnalisation', icon: 'fa-cogs', label: 'Fiche révision' },
            { id: 'aller-plus-loin', icon: 'fa-external-link-alt', label: 'Aller plus loin', show: this.lessonData.resources?.length > 0 },
            { id: 'quiz', icon: 'fa-question-circle', label: 'Quiz' }
        ];
        
        // Filtrer les onglets à afficher
        const visibleTabs = tabs.filter(tab => tab.show !== false);
        
        tabsContainer.innerHTML = visibleTabs.map(tab => `
            <button class="tab" onclick="contentLoader.switchTab('${tab.id}')" data-tab="${tab.id}">
                <i class="fas ${tab.icon}"></i> ${tab.label}
            </button>
        `).join('');
    }

    /**
     * Crée la section cours
     */
    createCourseSection() {
        const container = document.getElementById('lesson-content');
        if (!container) return;

        const section = document.createElement('section');
        section.className = 'content-section';
        section.id = 'cours';
        
        let html = `
            <h1>
                <i class="${this.lessonData.icon || 'fas fa-book'}"></i> 
                ${this.lessonData.title}
            </h1>
            <div class="lesson-meta">
                <span class="badge badge-${this.lessonData.difficulty}">
                    ${this.lessonData.difficulty}
                </span>
                <span class="time-badge">
                    <i class="fas fa-clock"></i> ${this.lessonData.estimated_time} min
                </span>
            </div>
        `;
        
        // Parcourir les sections de la leçon
        this.lessonData.sections.forEach(sectionData => {
            switch(sectionData.type) {
                case 'text':
                    html += this.renderTextSection(sectionData);
                    break;
                case 'table':
                    html += this.renderTableSection(sectionData);
                    break;
                case 'exemple':
                    html += this.renderExampleSection(sectionData);
                    break;
            }
        });
        
        // Ajouter les astuces mnémotechniques
        if (this.lessonData.tips && this.lessonData.tips.length > 0) {
            html += this.renderTipsSection();
        }
        
        // Ajouter les exercices
        if (this.lessonData.exercises && this.lessonData.exercises.length > 0) {
            html += this.renderExercisesSection();
        }
        
        section.innerHTML = html;
        container.innerHTML = '';
        container.appendChild(section);
    }

    /**
     * Rend une section de texte
     */
    renderTextSection(section) {
        return `
            <div class="lesson-section">
                ${section.title ? `<h2><i class="fas fa-info-circle"></i> ${section.title}</h2>` : ''}
                <div class="lesson-content">${section.content}</div>
            </div>
        `;
    }

    /**
     * Rend une section de tableau
     */
    renderTableSection(section) {
        const { headers, rows } = section.data;
        
        let tableHTML = `
            <div class="lesson-section">
                <h2><i class="fas fa-table"></i> ${section.title}</h2>
                <div class="conjugation-tables">
        `;
        
        rows.forEach(row => {
            tableHTML += `
                <div class="conjugation-table">
                    <h3><i class="fas fa-chevron-right"></i> ${row[0]}</h3>
                    <div class="verb-grid">
            `;
            
            for (let i = 1; i < headers.length; i++) {
                tableHTML += `
                    <div class="verb-row">
                        <span class="pronoun">${headers[i]}</span>
                        <span class="verb-form">${row[i]}</span>
                    </div>
                `;
            }
            
            tableHTML += `
                    </div>
                </div>
            `;
        });
        
        tableHTML += `
                </div>
            </div>
        `;
        
        return tableHTML;
    }

    /**
     * Rend une section d'exemples
     */
    renderExampleSection(section) {
        let html = `
            <div class="lesson-section">
                <h2><i class="fas fa-check-circle"></i> ${section.title}</h2>
                <div class="examples-grid">
        `;
        
        section.content.forEach(example => {
            html += `
                <div class="example-card">
                    <h4>${example.verb}</h4>
                    <p class="example-text">${example.example}</p>
                    <small class="example-note">${example.note}</small>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Rend la section des astuces
     */
    renderTipsSection() {
        let html = `
            <div class="lesson-section">
                <h2><i class="fas fa-lightbulb"></i> Astuces Mnémotechniques</h2>
                <div class="tips-grid">
        `;
        
        this.lessonData.tips.forEach(tip => {
            html += `
                <div class="tip-card" style="border-left: 4px solid ${tip.color || '#ffb703'}">
                    <div class="tip-icon" style="color: ${tip.color || '#ffb703'}">
                        <i class="${tip.icon || 'fas fa-star'}"></i>
                    </div>
                    <div class="tip-content">
                        <h4>${tip.title}</h4>
                        <p>${tip.content}</p>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Rend la section des exercices
     */
    renderExercisesSection() {
        let html = `
            <div class="lesson-section">
                <h2><i class="fas fa-pencil-alt"></i> Exercices d'application</h2>
                <div class="exercises-container" id="exercises-container">
        `;
        
        this.lessonData.exercises.forEach((exercise, index) => {
            html += `
                <div class="exercise-card">
                    <h4>Exercice ${index + 1}</h4>
                    <p><strong>${exercise.instruction}</strong></p>
                    <div class="exercise-questions">
            `;
            
            exercise.questions.forEach((question, qIndex) => {
                html += `
                    <div class="exercise-question">
                        <label>${qIndex + 1}. ${question}</label>
                        <input type="text" 
                               class="exercise-input" 
                               data-exercise="${index}" 
                               data-question="${qIndex}"
                               placeholder="Votre réponse...">
                    </div>
                `;
            });
            
            html += `
                    </div>
                    <button class="btn btn-primary" onclick="contentLoader.checkExercise(${index})">
                        <i class="fas fa-check"></i> Vérifier
                    </button>
                    <div class="exercise-feedback" id="exercise-feedback-${index}"></div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Crée la section exceptions
     */
    createExceptionsSection() {
        const container = document.getElementById('lesson-content');
        if (!this.lessonData.exceptions || this.lessonData.exceptions.length === 0) return;

        const section = document.createElement('section');
        section.className = 'content-section';
        section.id = 'exceptions';
        section.style.display = 'none';
        
        let html = `
            <h1><i class="fas fa-exclamation-triangle"></i> Exceptions et Pièges</h1>
            <div class="exceptions-grid">
        `;
        
        this.lessonData.exceptions.forEach(exception => {
            html += `
                <div class="exception-card">
                    <div class="exception-header">
                        <i class="${exception.icon || 'fas fa-bolt'}"></i>
                        <h3>${exception.title}</h3>
                    </div>
                    <p>${exception.description}</p>
            `;
            
            if (exception.examples && exception.examples.length > 0) {
                html += '<ul class="exception-examples">';
                exception.examples.forEach(example => {
                    if (typeof example === 'string') {
                        html += `<li>${example}</li>`;
                    } else {
                        html += `
                            <li>
                                ${example.error ? `<div class="error-example">${example.error}</div>` : ''}
                                ${example.correct ? `<div class="correct-example">${example.correct}</div>` : ''}
                                ${example.verb ? `<strong>${example.verb}:</strong> ${example.conjugation || example.note}` : ''}
                                ${example.explanation ? `<small>${example.explanation}</small>` : ''}
                            </li>
                        `;
                    }
                });
                html += '</ul>';
            }
            
            html += `</div>`;
        });
        
        html += `</div>`;
        section.innerHTML = html;
        container.appendChild(section);
    }

    /**
     * Crée la section carte mentale
     */
    createMindmapSection() {
        const container = document.getElementById('lesson-content');
        const section = document.createElement('section');
        section.className = 'content-section';
        section.id = 'carte-mentale';
        section.style.display = 'none';
        
        let html = `
            <h1><i class="fas fa-project-diagram"></i> Carte Mentale</h1>
        `;
        
        if (this.lessonData.mindmap && this.lessonData.mindmap.image) {
            html += `
                <div class="mindmap-container">
                    <img src="${this.lessonData.mindmap.image}" 
                         alt="Carte mentale - ${this.lessonData.title}"
                         class="mindmap-image">
                    <p class="mindmap-description">${this.lessonData.mindmap.description || ''}</p>
                </div>
            `;
        } else {
            html += `
                <div class="mindmap-placeholder">
                    <i class="fas fa-image" style="font-size: 4rem; color: #ccc;"></i>
                    <p>Carte mentale en cours de création...</p>
                </div>
            `;
        }
        
        html += `
            <div class="mindmap-actions">
                <button class="btn btn-secondary" onclick="contentLoader.downloadMindmap()">
                    <i class="fas fa-download"></i> Télécharger
                </button>
                <button class="btn btn-accent" onclick="contentLoader.uploadCustomMindmap()">
                    <i class="fas fa-upload"></i> Importer ma propre carte
                </button>
            </div>
        `;
        
        section.innerHTML = html;
        container.appendChild(section);
    }

    /**
     * Crée la section de personnalisation
     */
    createCustomizationSection() {
        const container = document.getElementById('lesson-content');
        const section = document.createElement('section');
        section.className = 'content-section';
        section.id = 'personnalisation';
        section.style.display = 'none';
        
        section.innerHTML = `
            <h1><i class="fas fa-cogs"></i> Personnalise ta Fiche de Révision</h1>
            <p>Sélectionne les éléments que tu souhaites inclure dans ta fiche PDF personnalisée :</p>
            
            <div class="customization-grid">
                ${this.lessonData.customization_options ? this.lessonData.customization_options.map(option => `
                    <label class="custom-checkbox">
                        <input type="checkbox" name="fiche-element" value="${option}" checked>
                        <span>${this.formatOptionLabel(option)}</span>
                    </label>
                `).join('') : '<p>Options de personnalisation non disponibles</p>'}
            </div>
            
            <div class="fiche-preview" id="fiche-preview">
                <h4>Aperçu de votre fiche</h4>
                <p>Sélectionnez des éléments ci-dessus pour voir l'aperçu</p>
            </div>
            
            <button class="btn btn-accent" onclick="contentLoader.generateCustomSheet()">
                <i class="fas fa-file-pdf"></i> Générer ma fiche PDF
            </button>
        `;
        
        container.appendChild(section);
    }

    /**
     * Crée la section ressources
     */
    createResourcesSection() {
        const container = document.getElementById('lesson-content');
        if (!this.lessonData.resources || this.lessonData.resources.length === 0) return;

        const section = document.createElement('section');
        section.className = 'content-section';
        section.id = 'aller-plus-loin';
        section.style.display = 'none';
        
        let html = `
            <h1><i class="fas fa-external-link-alt"></i> Pour Aller Plus Loin</h1>
            <div class="resources-grid">
        `;
        
        this.lessonData.resources.forEach(resource => {
            const iconMap = {
                'video': 'fa-play-circle',
                'exercices_interactifs': 'fa-laptop',
                'fiche': 'fa-file-pdf'
            };
            
            html += `
                <div class="resource-card">
                    <div class="resource-icon">
                        <i class="fas ${iconMap[resource.type] || 'fa-link'}"></i>
                    </div>
                    <h4>${resource.title}</h4>
                    <p>${resource.description}</p>
                    ${resource.duration ? `<small><i class="fas fa-clock"></i> ${resource.duration}</small>` : ''}
                    <a href="${resource.url}" target="_blank" class="btn btn-outline">
                        Accéder <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            `;
        });
        
        html += `</div>`;
        section.innerHTML = html;
        container.appendChild(section);
    }

    /**
     * Crée la section quiz
     */
    createQuizSection() {
        const container = document.getElementById('lesson-content');
        const section = document.createElement('section');
        section.className = 'content-section';
        section.id = 'quiz';
        section.style.display = 'none';
        
        section.innerHTML = `
            <div id="quiz-container">
                <div class="quiz-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Chargement du quiz...</p>
                </div>
            </div>
            <div id="quiz-results" style="display: none;"></div>
        `;
        
        container.appendChild(section);
    }

    /**
     * Change l'onglet actif
     */
    switchTab(tabId) {
        // Cacher toutes les sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Désactiver tous les onglets
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Afficher la section sélectionnée
        const section = document.getElementById(tabId);
        if (section) {
            section.style.display = 'block';
            
            // Activer l'onglet correspondant
            const tab = document.querySelector(`.tab[data-tab="${tabId}"]`);
            if (tab) tab.classList.add('active');
            
            // Si c'est l'onglet Quiz, charger le quiz
            if (tabId === 'quiz') {
                this.loadQuiz();
            }
        }
    }

    /**
     * Charge le quiz de la leçon
     */
    async loadQuiz() {
        try {
            const quizFile = `${this.quizPath}${this.lessonData.category}/${this.lessonData.id}-quiz.json`;
            const response = await fetch(quizFile);
            
            if (!response.ok) {
                throw new Error('Quiz non disponible');
            }
            
            const quizData = await response.json();
            
            // Utiliser le QuizSystem pour afficher le quiz
            if (typeof quizSystem !== 'undefined') {
                quizSystem.loadQuizData(quizData);
            }
            
        } catch (error) {
            console.error('Erreur chargement quiz:', error);
            document.getElementById('quiz-container').innerHTML = `
                <div class="no-quiz">
                    <i class="fas fa-info-circle"></i>
                    <h3>Quiz non disponible</h3>
                    <p>Le quiz pour cette leçon sera bientôt disponible.</p>
                    <button class="btn btn-primary" onclick="contentLoader.switchTab('cours')">
                        <i class="fas fa-arrow-left"></i> Retour à la leçon
                    </button>
                </div>
            `;
        }
    }

    /**
     * Vérifier un exercice
     */
    checkExercise(exerciseIndex) {
        const exercise = this.lessonData.exercises[exerciseIndex];
        const inputs = document.querySelectorAll(`input[data-exercise="${exerciseIndex}"]`);
        const feedbackDiv = document.getElementById(`exercise-feedback-${exerciseIndex}`);
        
        let correct = 0;
        let total = exercise.answers.length;
        
        inputs.forEach((input, index) => {
            const userAnswer = input.value.trim().toLowerCase();
            const correctAnswer = exercise.answers[index].toLowerCase();
            
            if (userAnswer === correctAnswer) {
                input.style.borderColor = 'var(--success)';
                input.style.backgroundColor = '#e8f5e9';
                correct++;
            } else {
                input.style.borderColor = 'var(--danger)';
                input.style.backgroundColor = '#ffebee';
            }
        });
        
        const percentage = (correct / total) * 100;
        const icon = percentage >= 80 ? 'fa-trophy' : percentage >= 60 ? 'fa-thumbs-up' : 'fa-redo';
        const color = percentage >= 80 ? 'var(--success)' : percentage >= 60 ? 'var(--warning)' : 'var(--danger)';
        
        feedbackDiv.innerHTML = `
            <div class="feedback" style="color: ${color};">
                <i class="fas ${icon}"></i>
                <strong>${correct}/${total} correct</strong>
                ${percentage < 100 ? '<p>Réessaye les réponses incorrectes !</p>' : '<p>Parfait ! 🎉</p>'}
            </div>
        `;
        feedbackDiv.style.display = 'block';
    }

    /**
     * Utilitaires
     */
    
    formatOptionLabel(option) {
        const labels = {
            'cours-simplifie': 'Cours simplifié',
            'cours-complet': 'Cours complet',
            'tableaux-conjugaison': 'Tableaux de conjugaison',
            'exceptions-principales': 'Exceptions principales',
            'astuces-mnemo': 'Astuces mnémotechniques',
            'pieges-courants': 'Pièges courants',
            'carte-mentale': 'Carte mentale',
            'exemples-pratiques': 'Exemples pratiques',
            'exercices-application': 'Exercices d\'application',
            'corriges-exercices': 'Corrigés',
            'quiz-revision': 'Quiz de révision',
            'resume-final': 'Résumé final',
            'espace-notes': 'Espace pour notes'
        };
        return labels[option] || option;
    }

    trackLessonAccess(lessonId) {
        // Enregistrer l'accès à la leçon
        const userId = localStorage.getItem('currentUserId') || 1;
        const accessData = {
            user_id: userId,
            lesson_id: lessonId,
            accessed_at: new Date().toISOString()
        };
        
        // Sauvegarder localement
        const accessHistory = JSON.parse(localStorage.getItem('lessonAccessHistory') || '[]');
        accessHistory.push(accessData);
        localStorage.setItem('lessonAccessHistory', JSON.stringify(accessHistory));
    }

    showLoader() {
        const loader = document.getElementById('page-loader');
        if (loader) loader.style.display = 'flex';
    }

    hideLoader() {
        const loader = document.getElementById('page-loader');
        if (loader) loader.style.display = 'none';
    }

    showError(message) {
        const container = document.getElementById('lesson-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Erreur</h2>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Réessayer
                </button>
            </div>
        `;
    }

    generateCustomSheet() {
        alert('Génération de la fiche PDF en cours... (fonctionnalité à implémenter avec jsPDF)');
    }

    downloadMindmap() {
        if (this.lessonData.mindmap && this.lessonData.mindmap.image) {
            window.open(this.lessonData.mindmap.image, '_blank');
        }
    }

    uploadCustomMindmap() {
        alert('Fonctionnalité d\'upload à implémenter');
    }

    initializeInteractiveElements() {
        // Ajouter les écouteurs d'événements pour la personnalisation
        const checkboxes = document.querySelectorAll('input[name="fiche-element"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updatePreview());
        });
        this.updatePreview();
    }

    updatePreview() {
        const selectedElements = Array.from(
            document.querySelectorAll('input[name="fiche-element"]:checked')
        ).map(cb => cb.value);
        
        const preview = document.getElementById('fiche-preview');
        if (!preview) return;
        
        if (selectedElements.length === 0) {
            preview.innerHTML = '<p>Aucun élément sélectionné</p>';
            return;
        }
        
        preview.innerHTML = `
            <h4>Votre fiche contiendra :</h4>
            <ul>
                ${selectedElements.map(el => `<li>${this.formatOptionLabel(el)}</li>`).join('')}
            </ul>
            <p><strong>${selectedElements.length}</strong> élément(s) sélectionné(s)</p>
        `;
    }
}

// Initialiser le ContentLoader
const contentLoader = new ContentLoader();

// Fonction globale pour charger une leçon (accessible depuis le HTML)
function loadLesson(categoryId, lessonId) {
    contentLoader.loadLesson(categoryId, lessonId);
}

// Au chargement de la page, récupérer les paramètres URL
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('lesson');
    const categoryId = urlParams.get('category') || 'conjugaison';
    
    if (lessonId) {
        loadLesson(categoryId, lessonId);
    }
});
