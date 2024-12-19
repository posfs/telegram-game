// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Развернуть на весь экран

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Размеры канваса
        this.canvas.width = 320;
        this.canvas.height = 480;
        
        // Загрузка изображений
        this.meteorImage = new Image();
        this.meteorImage.src = 'meteor.png';
        
        // Загружаем изображение корабля
        this.shipImage = new Image();
        this.shipImage.src = 'xwing.png';
        
        // Инициализация игровых объектов
        this.player = {
            x: this.canvas.width / 2 - 25,
            y: this.canvas.height - 60,
            width: 50,
            height: 50,
            speed: 5
        };
        
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.score = 0;
        
        // Параметры анимац��и
        this.fireColors = ['#ff0000', '#ff6600', '#ffff00'];
        this.fireFrame = 0;
        
        // Инициализация управления
        this.setupControls();
        
        // Запуск игрового цикла после загрузки изображений
        this.meteorImage.onload = () => {
            this.gameLoop();
        };
        
        this.playerTilt = 0; // Добавляем наклон при движении
        
        // Добавляем обработчик для кнопки выхода
        this.setupExitButton();
        
        // Добавляем обработчик закрытия окна
        window.addEventListener('beforeunload', () => {
            if (this.score > 0 && window.Telegram.WebApp) {
                window.Telegram.WebApp.sendData(this.score.toString());
            }
        });
    }
    
    setupControls() {
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const newX = touch.clientX - rect.left - this.player.width / 2;
            
            this.playerTilt = (newX - this.player.x) * 0.1;
            this.playerTilt = Math.max(Math.min(this.playerTilt, Math.PI/6), -Math.PI/6);
            
            this.player.x = Math.max(0, Math.min(newX, this.canvas.width - this.player.width));
        });
        
        // Управление мышью
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const newX = e.clientX - rect.left - this.player.width / 2;
            
            this.playerTilt = (newX - this.player.x) * 0.1;
            this.playerTilt = Math.max(Math.min(this.playerTilt, Math.PI/6), -Math.PI/6);
            
            this.player.x = Math.max(0, Math.min(newX, this.canvas.width - this.player.width));
        });
        
        // Управление клавиатурой
        this.keys = {};
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // Стрельба на пробел
            if (e.key === ' ') {
                this.shoot();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Стрельба по клику
        this.canvas.addEventListener('click', () => {
            this.shoot();
        });
        
        // Сброс наклона
        this.canvas.addEventListener('touchend', () => {
            this.playerTilt = 0;
        });
        
        this.canvas.addEventListener('mouseout', () => {
            this.playerTilt = 0;
        });
    }
    
    shoot() {
        // Обновляем позиции появления лазеров
        const laserOffset = 15; // Расстояние между лазерами
        
        // Создаем два лазерных выстрела
        this.bullets.push(
            {
                x: this.player.x + this.player.width/2 - laserOffset,
                y: this.player.y,
                width: 3,
                height: 15,
                speed: 8,
                color: '#ff0000' // Красный цвет для лазеров
            },
            {
                x: this.player.x + this.player.width/2 + laserOffset,
                y: this.player.y,
                width: 3,
                height: 15,
                speed: 8,
                color: '#ff0000'
            }
        );
    }
    
    spawnEnemy() {
        if (Math.random() < 0.02) {
            this.enemies.push({
                x: Math.random() * (this.canvas.width - 40),
                y: -40,
                width: 40,
                height: 40,
                speed: 2,
                rotation: Math.random() * Math.PI * 2
            });
        }
    }
    
    update() {
        // Добавьте в начало метода update():
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            this.player.x -= this.player.speed;
            this.playerTilt = -Math.PI/12;
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            this.player.x += this.player.speed;
            this.playerTilt = Math.PI/12;
        }
        
        // Ограничение движения игрока
        this.player.x = Math.max(0, Math.min(this.player.x, this.canvas.width - this.player.width));
        
        // Обновление врагов
        this.enemies.forEach((enemy, index) => {
            enemy.y += enemy.speed;
            if (enemy.y > this.canvas.height) {
                this.enemies.splice(index, 1);
            }
        });
        
        // Обновление пуль и проверка столкновений
        this.bullets.forEach((bullet, bulletIndex) => {
            bullet.y -= bullet.speed;
            
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.checkCollision(bullet, enemy)) {
                    const explosion = this.addExplosion(
                        enemy.x + enemy.width/2,
                        enemy.y + enemy.height/2
                    );
                    this.explosions.push(explosion);
                    
                    this.bullets.splice(bulletIndex, 1);
                    this.enemies.splice(enemyIndex, 1);
                    this.score += 100;
                }
            });
            
            if (bullet.y < 0) {
                this.bullets.splice(bulletIndex, 1);
            }
        });
        
        // Обновление взрывов
        this.explosions = this.explosions.filter(particles => {
            return particles.some(p => p.life > 0);
        });
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    addExplosion(x, y) {
        const particles = [];
        for(let i = 0; i < 20; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1
            });
        }
        return particles;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Затемнение фона
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Отрисовка игрока (X-Wing)
        this.ctx.save();
        this.ctx.translate(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
        this.ctx.rotate(this.playerTilt);
        
        // Добавляем эффект двигателей
        this.ctx.fillStyle = 'rgba(0, 195, 255, 0.6)';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00ffff';
        
        // Левый двигатель
        this.ctx.fillRect(-20, 20, 8, 5 + Math.random() * 3);
        // Правый двигатель
        this.ctx.fillRect(12, 20, 8, 5 + Math.random() * 3);
        
        this.ctx.shadowBlur = 0;
        
        // Отрисовка самого корабля
        this.ctx.drawImage(
            this.shipImage,
            -this.player.width/2,
            -this.player.height/2,
            this.player.width,
            this.player.height
        );
        
        this.ctx.restore();
        
        // Отрисовка врагов
        this.fireFrame = (this.fireFrame + 1) % 30;
        this.enemies.forEach(enemy => {
            this.ctx.save();
            this.ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
            enemy.rotation += 0.02;
            this.ctx.rotate(enemy.rotation);
            
            // Отрисовка огня
            const fireHeight = 20 + Math.sin(this.fireFrame * 0.2) * 5;
            this.fireColors.forEach((color, index) => {
                this.ctx.fillStyle = color;
                this.ctx.globalAlpha = 1 - (index * 0.2);
                this.ctx.beginPath();
                this.ctx.moveTo(-20, -20);
                this.ctx.lineTo(0, -20 - fireHeight * (1 - index * 0.3));
                this.ctx.lineTo(20, -20);
                this.ctx.closePath();
                this.ctx.fill();
            });
            
            this.ctx.globalAlpha = 1;
            this.ctx.drawImage(
                this.meteorImage,
                -enemy.width/2,
                -enemy.height/2,
                enemy.width,
                enemy.height
            );
            
            this.ctx.restore();
        });
        
        // Отрисовка пуль
        this.drawBullets();
        
        // Отрисовка взрывов
        this.explosions.forEach(particles => {
            particles.forEach(particle => {
                if(particle.life > 0) {
                    this.ctx.beginPath();
                    this.ctx.fillStyle = `rgba(255, ${Math.floor(particle.life * 255)}, 0, ${particle.life})`;
                    this.ctx.arc(particle.x, particle.y, particle.life * 3, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
        });
        
        // Отрисовка счета
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText(`Счет: ${this.score}`, 10, 30);
    }
    
    drawBullets() {
        this.bullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = bullet.color;
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        this.ctx.shadowBlur = 0;
    }
    
    gameLoop() {
        this.spawnEnemy();
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    setupExitButton() {
        const exitButton = document.getElementById('exitButton');
        exitButton.addEventListener('click', () => {
            // Отправляем счет перед закрытием
            if (window.Telegram.WebApp) {
                window.Telegram.WebApp.sendData(this.score.toString());
                
                setTimeout(() => {
                    if (window.Telegram.WebApp.isExpanded) {
                        window.Telegram.WebApp.close();
                    } else {
                        window.close();
                    }
                }, 100); // Небольшая задержка для гарантии отправки данных
            }
        });
    }
}

// Запуск игры
window.onload = () => {
    new Game();
}; 
