/**
 * PROGRESS TRACKER - Système de suivi de progression
 * Gère la progression de l'utilisateur à travers les leçons et quiz
 */

class ProgressTracker {
    constructor() {
        this.currentUserId = this.getCurrentUserId();
        this.progress = this.loadProgress();
        this.startTime = null;
        this.activityLog = [];
    }

    /**
     * Obtenir l'ID de l'utilisateur actuel
     */
    getCurrentUserId() {
        return localStorage.getItem('currentUserId') || null;
    }

    /**
     * Charger la progression depuis localStorage
     */
    loadProgress() {
        if (!this.currentUserId) return {};
        
        const key = `progress_user_${this.currentUserId}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Initialiser une nouvelle progression
        return {
            user_id: this.currentUserId,
            lessons: {},
            quiz_results: {},
            statistics: {
                total_lessons_started: 0,
                total_lessons_completed: 0,
                total_quiz_attempted: 0,
                total_quiz_passed: 0,
                total_time_spent: 0,
                average_score: 0,
                streak_days: 0,
                last_activity: null
            },
            achievements: [],
            weak_points: [],
            goals: this.getDefaultGoals()
        };
    }

    /**
     * Sauvegarder la progression
     */
    saveProgress() {
        if (!this.currentUserId) return false;
        
        const key = `progress_user_${this.currentUserId}`;
        this.progress.statistics.last_activity = new Date().toISOString();
        
        localStorage.setItem(key, JSON.stringify(this.progress));
        
        // Sauvegarder également l'historique d'activité
        this.saveActivityLog();
        
        return true;
    }

    /**
     * Démarrer le suivi d'une leçon
     */
    startLesson(lessonId, categoryId) {
        const lessonKey = `${categoryId}/${lessonId}`;
        
        if (!this.progress.lessons[lessonKey]) {
            this.progress.lessons[lessonKey] = {
                lesson_id: lessonId,
                category_id: categoryId,
                status: 'in_progress',
                started_at: new Date().toISOString(),
                completed_at: null,
                time_spent: 0,
                visits: 1,
                scroll_depth: 0,
                sections_viewed: [],
                quiz_attempted: false,
                quiz_score: null
            };
            
            this.progress.statistics.total_lessons_started++;
        } else {
            this.progress.lessons[lessonKey].visits++;
            this.progress.lessons[lessonKey].status = 'in_progress';
        }
        
        // Démarrer le chronomètre
        this.startTime = Date.now();
        
        // Enregistrer l'activité
        this.logActivity('lesson_started', { lessonId, categoryId });
        
        this.saveProgress();
    }

    /**
     * Mettre à jour la progression dans une leçon
     */
    updateLessonProgress(lessonId, categoryId, data) {
        const lessonKey = `${categoryId}/${lessonId}`;
        const lesson = this.progress.lessons[lessonKey];
        
        if (!lesson) return;
        
        // Mettre à jour les données
        Object.assign(lesson, data);
        
        // Calculer le temps passé
        if (this.startTime) {
            const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
            lesson.time_spent += timeSpent;
            this.progress.statistics.total_time_spent += timeSpent;
            this.startTime = Date.now(); // Réinitialiser
        }
        
        this.saveProgress();
    }

    /**
     * Marquer une leçon comme complétée
     */
    completeLesson(lessonId, categoryId, quizScore = null) {
        const lessonKey = `${categoryId}/${lessonId}`;
        const lesson = this.progress.lessons[lessonKey];
        
        if (!lesson) return;
        
        // Vérifier les conditions de complétion
        const config = window.APP_CONFIG?.progress?.completion || {};
        const canComplete = this.checkCompletionConditions(lesson, quizScore, config);
        
        if (canComplete) {
            lesson.status = 'completed';
            lesson.completed_at = new Date().toISOString();
            lesson.quiz_score = quizScore;
            
            this.progress.statistics.total_lessons_completed++;
            
            // Vérifier les succès
            this.checkAchievements();
            
            // Enregistrer l'activité
            this.logActivity('lesson_completed', { lessonId, categoryId, score: quizScore });
            
            this.saveProgress();
            
            return true;
        }
        
        return false;
    }

    /**
     * Vérifier les conditions de complétion
     */
    checkCompletionConditions(lesson, quizScore, config) {
        // Temps minimum
        if (config.minimumTimeSpent && lesson.time_spent < config.minimumTimeSpent) {
            return false;
        }
        
        // Profondeur de lecture
        if (config.minimumScrollPercentage && lesson.scroll_depth < config.minimumScrollPercentage) {
            return false;
        }
        
        // Quiz requis
        if (config.quizRequired && !lesson.quiz_attempted) {
            return false;
        }
        
        // Score minimum au quiz
        if (config.quizRequired && config.minimumQuizScore && quizScore < config.minimumQuizScore) {
            return false;
        }
        
        return true;
    }

    /**
     * Enregistrer un résultat de quiz
     */
    recordQuizResult(lessonId, categoryId, quizData) {
        const lessonKey = `${categoryId}/${lessonId}`;
        const quizKey = `quiz_${lessonKey}`;
        
        // Créer ou mettre à jour le résultat du quiz
        if (!this.progress.quiz_results[quizKey]) {
            this.progress.quiz_results[quizKey] = {
                lesson_id: lessonId,
                category_id: categoryId,
                attempts: []
            };
        }
        
        // Ajouter cette tentative
        const attempt = {
            attempt_number: this.progress.quiz_results[quizKey].attempts.length + 1,
            date: new Date().toISOString(),
            score: quizData.score,
            percentage: quizData.percentage,
            time_taken: quizData.timeTaken,
            correct_answers: quizData.correctAnswers,
            total_questions: quizData.totalQuestions,
            weak_points: quizData.weakPoints || []
        };
        
        this.progress.quiz_results[quizKey].attempts.push(attempt);
        
        // Mettre à jour les statistiques
        this.progress.statistics.total_quiz_attempted++;
        
        if (quizData.percentage >= (window.APP_CONFIG?.quiz?.passingScore || 60)) {
            this.progress.statistics.total_quiz_passed++;
        }
        
        // Calculer le score moyen
        this.calculateAverageScore();
        
        // Analyser les points faibles
        if (quizData.weakPoints && quizData.weakPoints.length > 0) {
            this.updateWeakPoints(quizData.weakPoints);
        }
        
        // Marquer le quiz comme tenté dans la leçon
        if (this.progress.lessons[lessonKey]) {
            this.progress.lessons[lessonKey].quiz_attempted = true;
            this.progress.lessons[lessonKey].quiz_score = quizData.percentage;
        }
        
        // Enregistrer l'activité
        this.logActivity('quiz_completed', {
            lessonId,
            categoryId,
            score: quizData.percentage,
            passed: quizData.percentage >= 60
        });
        
        this.saveProgress();
        
        return attempt;
    }

    /**
     * Calculer le score moyen
     */
    calculateAverageScore() {
        const allScores = [];
        
        Object.values(this.progress.quiz_results).forEach(quizResult => {
            quizResult.attempts.forEach(attempt => {
                allScores.push(attempt.percentage);
            });
        });
        
        if (allScores.length > 0) {
            const sum = allScores.reduce((a, b) => a + b, 0);
            this.progress.statistics.average_score = Math.round(sum / allScores.length);
        }
    }

    /**
     * Mettre à jour les points faibles
     */
    updateWeakPoints(newWeakPoints) {
        newWeakPoints.forEach(point => {
            const existing = this.progress.weak_points.find(wp => wp.keyword === point);
            
            if (existing) {
                existing.count++;
                existing.last_seen = new Date().toISOString();
            } else {
                this.progress.weak_points.push({
                    keyword: point,
                    count: 1,
                    first_seen: new Date().toISOString(),
                    last_seen: new Date().toISOString(),
                    status: 'needs_work'
                });
            }
        });
        
        // Trier par fréquence
        this.progress.weak_points.sort((a, b) => b.count - a.count);
    }

    /**
     * Obtenir les statistiques de progression
     */
    getStatistics() {
        return {
            ...this.progress.statistics,
            completion_rate: this.calculateCompletionRate(),
            time_formatted: this.formatTime(this.progress.statistics.total_time_spent),
            level: this.calculateLevel(),
            next_level_progress: this.calculateLevelProgress()
        };
    }

    /**
     * Calculer le taux de complétion
     */
    calculateCompletionRate() {
        const started = this.progress.statistics.total_lessons_started;
        const completed = this.progress.statistics.total_lessons_completed;
        
        if (started === 0) return 0;
        return Math.round((completed / started) * 100);
    }

    /**
     * Calculer le niveau de l'utilisateur
     */
    calculateLevel() {
        const xp = this.calculateXP();
        return Math.floor(xp / 1000) + 1; // 1000 XP par niveau
    }

    /**
     * Calculer les points d'expérience
     */
    calculateXP() {
        let xp = 0;
        
        // XP pour les leçons complétées
        xp += this.progress.statistics.total_lessons_completed * 100;
        
        // XP pour les quiz réussis
        xp += this.progress.statistics.total_quiz_passed * 200;
        
        // XP pour le score moyen
        xp += this.progress.statistics.average_score * 5;
        
        // XP pour la régularité (streak)
        xp += this.progress.statistics.streak_days * 50;
        
        return xp;
    }

    /**
     * Calculer la progression vers le prochain niveau
     */
    calculateLevelProgress() {
        const xp = this.calculateXP();
        const currentLevelXP = (this.calculateLevel() - 1) * 1000;
        const xpInCurrentLevel = xp - currentLevelXP;
        
        return Math.round((xpInCurrentLevel / 1000) * 100);
    }

    /**
     * Vérifier et débloquer les succès
     */
    checkAchievements() {
        const achievements = [
            {
                id: 'first_lesson',
                name: 'Première leçon',
                description: 'Complète ta première leçon',
                icon: 'fas fa-star',
                condition: () => this.progress.statistics.total_lessons_completed >= 1
            },
            {
                id: 'five_lessons',
                name: 'Étudiant assidu',
                description: 'Complète 5 leçons',
                icon: 'fas fa-graduation-cap',
                condition: () => this.progress.statistics.total_lessons_completed >= 5
            },
            {
                id: 'ten_lessons',
                name: 'Expert',
                description: 'Complète 10 leçons',
                icon: 'fas fa-trophy',
                condition: () => this.progress.statistics.total_lessons_completed >= 10
            },
            {
                id: 'perfect_quiz',
                name: 'Sans faute',
                description: 'Obtiens 100% à un quiz',
                icon: 'fas fa-medal',
                condition: () => {
                    return Object.values(this.progress.quiz_results).some(quiz =>
                        quiz.attempts.some(attempt => attempt.percentage === 100)
                    );
                }
            },
            {
                id: 'five_hours',
                name: 'Marathonien',
                description: 'Passe 5 heures à réviser',
                icon: 'fas fa-clock',
                condition: () => this.progress.statistics.total_time_spent >= 18000
            },
            {
                id: 'streak_7',
                name: 'Régularité',
                description: 'Révise 7 jours d\'affilée',
                icon: 'fas fa-fire',
                condition: () => this.progress.statistics.streak_days >= 7
            }
        ];
        
        achievements.forEach(achievement => {
            if (achievement.condition() && !this.hasAchievement(achievement.id)) {
                this.unlockAchievement(achievement);
            }
        });
    }

    /**
     * Vérifier si un succès est déjà débloqué
     */
    hasAchievement(achievementId) {
        return this.progress.achievements.some(a => a.id === achievementId);
    }

    /**
     * Débloquer un succès
     */
    unlockAchievement(achievement) {
        this.progress.achievements.push({
            ...achievement,
            unlocked_at: new Date().toISOString()
        });
        
        // Enregistrer l'activité
        this.logActivity('achievement_unlocked', { achievement: achievement.id });
        
        // Afficher une notification
        this.showAchievementNotification(achievement);
        
        this.saveProgress();
    }

    /**
     * Afficher une notification de succès
     */
    showAchievementNotification(achievement) {
        if (typeof showToast === 'function') {
            showToast({
                title: '🏆 Nouveau succès débloqué !',
                message: `${achievement.name}: ${achievement.description}`,
                type: 'success',
                duration: 5000
            });
        } else {
            console.log(`🏆 Succès débloqué: ${achievement.name}`);
        }
    }

    /**
     * Obtenir les recommandations personnalisées
     */
    getRecommendations() {
        const recommendations = [];
        
        // Recommandations basées sur les points faibles
        if (this.progress.weak_points.length > 0) {
            const topWeakPoint = this.progress.weak_points[0];
            recommendations.push({
                type: 'weak_point',
                priority: 'high',
                title: `Travaille ${topWeakPoint.keyword}`,
                description: `Tu as rencontré des difficultés ${topWeakPoint.count} fois sur ce sujet`,
                action: 'review',
                icon: 'fas fa-exclamation-triangle',
                color: '#f72585'
            });
        }
        
        // Recommandations basées sur la progression
        const completionRate = this.calculateCompletionRate();
        if (completionRate < 50) {
            recommendations.push({
                type: 'progress',
                priority: 'medium',
                title: 'Continue sur ta lancée !',
                description: `Tu as complété ${completionRate}% de tes leçons commencées`,
                action: 'continue',
                icon: 'fas fa-chart-line',
                color: '#4cc9f0'
            });
        }
        
        // Recommandations pour la régularité
        const daysSinceLastActivity = this.getDaysSinceLastActivity();
        if (daysSinceLastActivity >= 3) {
            recommendations.push({
                type: 'streak',
                priority: 'high',
                title: 'N\'oublie pas de réviser !',
                description: `Cela fait ${daysSinceLastActivity} jours depuis ta dernière session`,
                action: 'study',
                icon: 'fas fa-calendar-check',
                color: '#ffb703'
            });
        }
        
        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    /**
     * Calculer les jours depuis la dernière activité
     */
    getDaysSinceLastActivity() {
        if (!this.progress.statistics.last_activity) return 999;
        
        const lastActivity = new Date(this.progress.statistics.last_activity);
        const now = new Date();
        const diffTime = Math.abs(now - lastActivity);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    /**
     * Mettre à jour la série de jours consécutifs
     */
    updateStreak() {
        const today = new Date().toDateString();
        const lastActivity = this.progress.statistics.last_activity
            ? new Date(this.progress.statistics.last_activity).toDateString()
            : null;
        
        if (lastActivity === today) {
            // Déjà compté aujourd'hui
            return;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        if (lastActivity === yesterdayStr) {
            // Continuer la série
            this.progress.statistics.streak_days++;
        } else if (lastActivity !== today) {
            // Réinitialiser la série
            this.progress.statistics.streak_days = 1;
        }
    }

    /**
     * Enregistrer une activité
     */
    logActivity(action, data = {}) {
        this.activityLog.push({
            action,
            data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Sauvegarder l'historique d'activité
     */
    saveActivityLog() {
        if (this.activityLog.length === 0) return;
        
        const key = `activity_log_user_${this.currentUserId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Ajouter les nouvelles activités
        const merged = [...existing, ...this.activityLog];
        
        // Garder seulement les 100 dernières activités
        const trimmed = merged.slice(-100);
        
        localStorage.setItem(key, JSON.stringify(trimmed));
        
        // Vider le buffer
        this.activityLog = [];
    }

    /**
     * Obtenir l'historique d'activité
     */
    getActivityLog(limit = 10) {
        const key = `activity_log_user_${this.currentUserId}`;
        const log = JSON.parse(localStorage.getItem(key) || '[]');
        
        return log.slice(-limit).reverse();
    }

    /**
     * Formater le temps en heures et minutes
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes}min`;
    }

    /**
     * Obtenir les objectifs par défaut
     */
    getDefaultGoals() {
        const config = window.APP_CONFIG?.progress?.weeklyGoals || {};
        
        return {
            weekly: {
                lessons_completed: {
                    target: config.lessonsCompleted || 3,
                    current: 0
                },
                time_spent: {
                    target: config.timeSpent || 18000,
                    current: 0
                },
                average_score: {
                    target: config.averageScore || 80,
                    current: 0
                },
                streak_days: {
                    target: config.streakDays || 5,
                    current: 0
                }
            }
        };
    }

    /**
     * Réinitialiser la progression (attention !)
     */
    resetProgress() {
        if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser toute votre progression ?')) {
            const key = `progress_user_${this.currentUserId}`;
            localStorage.removeItem(key);
            this.progress = this.loadProgress();
            return true;
        }
        return false;
    }

    /**
     * Exporter la progression
     */
    exportProgress() {
        const data = {
            user_id: this.currentUserId,
            exported_at: new Date().toISOString(),
            progress: this.progress
        };
        
        return JSON.stringify(data, null, 2);
    }
}

// Initialiser le tracker de progression
const progressTracker = new ProgressTracker();

// Exporter pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressTracker;
}
