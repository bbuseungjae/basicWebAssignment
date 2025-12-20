// ===================== 이벤트 버스 ===========================
class MessageBus {
  constructor() {
    this._handlers = {};
  }

  on(type, handler) {
    if (!this._handlers[type]) this._handlers[type] = [];
    this._handlers[type].push(handler);
  }

  emit(type, payload) {
    const list = this._handlers[type];
    if (!list) return;
    for (const fn of list) {
      fn(payload || {});
    }
  }

  clear() {
    this._handlers = {};
  }
}

const EVENTS = {
  MOVE_UP: 'MOVE_UP',
  MOVE_DOWN: 'MOVE_DOWN',
  MOVE_LEFT: 'MOVE_LEFT',
  MOVE_RIGHT: 'MOVE_RIGHT',
  FIRE: 'FIRE',
  RESTART: 'RESTART',
  SPECIAL: 'SPECIAL', // 필살기

  HIT_ENEMY: 'HIT_ENEMY',
  HIT_ENEMY_BOSS: 'HIT_ENEMY_BOSS',
  HERO_HIT_BY_LASER: 'HERO_HIT_BY_LASER',
  ENEMY_COLLIDE_HERO: 'ENEMY_COLLIDE_HERO',
  ENEMY_BOSS_COLLIDE_HERO: 'ENEMY_BOSS_COLLIDE_HERO',
  ENEMY_PASS_CANVAS: 'ENEMY_PASS_CANVAS',

  GAME_WIN: 'GAME_WIN',
  GAME_LOSE: 'GAME_LOSE',
};

// ===================== 기본 객체 ===========================
class Entity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 0;
    this.height = 0;
    this.alive = true;
    this.kind = '';
    this.sprite = undefined;
  }

  getRect() {
    return {
      top: this.y,
      left: this.x,
      bottom: this.y + this.height,
      right: this.x + this.width,
    };
  }

  draw(ctx) {
    if (!this.sprite) return;
    ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
  }
}

// ===================== 플레이어 ===========================
class Player extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.kind = 'PLAYER';
    this.speed = 20;
    this.cooldown = 0;
    this.fireCooldownMax = 500; // 기본 발사 쿨타임(ms)
    this.hp = 3;
    this.score = 0;
    this.killCount = 0;

    // 파워업 상태
    this.rapidTimeout = null;    // 연사 파워업 타이머
    this.tripleEndTime = 0;      // 3발 파워업 끝나는 시간

    // 필살기 게이지 (0~100)
    this.specialCharge = 0;
  }

  canShoot() {
    return this.cooldown === 0;
  }

  shoot() {
    if (!this.canShoot()) return;

    const now = Date.now();
    let offsets = [45]; // 기본 한 발

    // 3발 아이템 효과 중이면 트리플 샷
    if (now < this.tripleEndTime) {
      offsets = [30, 45, 60]; // 3발 멀티샷
    }

    offsets.forEach((offset) => {
      objects.push(new PlayerLaser(this.x + offset, this.y - 10));
    });

    this.cooldown = this.fireCooldownMax;

    const id = setInterval(() => {
      this.cooldown -= 100;
      if (this.cooldown <= 0) clearInterval(id);
    }, 100);
  }

  takeDamage() {
    this.hp -= 1;
    if (this.hp <= 0) {
      this.alive = false;
    }
    if (this.hp <= 1) {
      this.sprite = heroDamagedImg;
      wing1.sprite = heroDamagedImg;
      wing2.sprite = heroDamagedImg;
    }
  }

  addScore(base = 100) {
    this.score += base;
  }

  // 필살기 게이지 채우기
  gainSpecial(amount = 10) {
    this.specialCharge = Math.min(100, this.specialCharge + amount);
  }

  specialReady() {
    return this.specialCharge >= 100;
  }

  // 필살기: 화면 전체 쓸기
  useSpecial() {
    if (!this.specialReady()) return;

    // 게이지 초기화
    this.specialCharge = 0;

    // 적 탄 제거
    const enemyBullets = objects.filter(
      (o) => o.kind === 'BULLET' && o.owner === 'ENEMY'
    );
    enemyBullets.forEach((b) => {
      b.alive = false;
    });

    // 일반 적 전원 제거
    const enemies = objects.filter(
      (o) => o.kind === 'ENEMY' && o.alive
    );
    enemies.forEach((e) => {
      e.alive = false;
      enemyCounter.dead += 1;
      this.killCount += 1;
      this.addScore(150); // 필살기 보너스 점수
      objects.push(new HitEffect(e.x, e.y, laserRedShotImg));
    });

    // 보스에게 큰 피해
    const bosses = objects.filter(
      (o) => o.kind === 'BOSS' && o.alive
    );
    bosses.forEach((b) => {
      b.hp -= 10; // 큰 피해
      if (b.hp <= 0) {
        b.alive = false;
        enemyCounter.dead += 1;
        this.killCount += 1;
        this.addScore(300);
        objects.push(new HitEffect(b.x, b.y, laserRedShotImg));
      } else {
        objects.push(new HitEffect(b.x, b.y, laserRedShotImg));
      }
    });

    if (allEnemiesCleared()) {
      bus.emit(EVENTS.GAME_WIN);
    }
  }
}

// 보조기(서브 히어로)
class WingShip extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 33;
    this.height = 25;
    this.kind = 'WING';
    this.cooldown = 0;
  }

  canShoot() {
    return this.cooldown === 0;
  }

  shoot() {
    if (!this.canShoot()) return;
    objects.push(new PlayerLaser(this.x + 12, this.y - 10));
    this.cooldown = 500;

    const id = setInterval(() => {
      this.cooldown -= 100;
      if (this.cooldown <= 0) clearInterval(id);
    }, 100);
  }
}

// ===================== 탄환 & 이펙트 ===========================
class Bullet extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 9;
    this.height = 33;
    this.kind = 'BULLET';
  }
}

class PlayerLaser extends Bullet {
  constructor(x, y) {
    super(x, y);
    this.sprite = laserRedImg;
    this.owner = 'PLAYER';

    const id = setInterval(() => {
      if (!this.alive) return clearInterval(id);
      this.y -= 15;
      if (this.y < -this.height) {
        this.alive = false;
        clearInterval(id);
      }
    }, 100);
  }
}

class EnemyLaser extends Bullet {
  constructor(x, y) {
    super(x, y);
    this.sprite = laserGreenImg;
    this.owner = 'ENEMY';

    const id = setInterval(() => {
      if (!this.alive) return clearInterval(id);
      this.y += 15;
      if (this.y > canvas.height) {
        this.alive = false;
        clearInterval(id);
      }
    }, 100);
  }
}

class HitEffect extends Entity {
  constructor(x, y, img) {
    super(x, y);
    this.width = 98;
    this.height = 98;
    this.kind = 'HIT';
    this.sprite = img;

    setTimeout(() => {
      this.alive = false;
    }, 1000);
  }
}

// ===================== 파워업 아이템 ===========================
// type: 'heart' | 'rapid' | 'triple'
class PowerUp extends Entity {
  constructor(x, y, type) {
    super(x, y);
    this.width = 30;
    this.height = 30;
    this.kind = 'ITEM';
    this.type = type;

    if (type === 'heart') {
      this.sprite = lifeImg;            // 하트/HP 아이콘
    } else if (type === 'rapid') {
      this.sprite = laserGreenShotImg;  // 초록 폭발 = 연사 강화
    } else {
      this.sprite = laserRedShotImg;    // 빨간 폭발 = 3발 샷
    }

    const id = setInterval(() => {
      if (!this.alive) return clearInterval(id);
      this.y += 5;
      if (this.y > canvas.height) {
        this.alive = false;
        clearInterval(id);
      }
    }, 100);
  }
}

// ===================== 적(일반 & 보스) ===========================
class EnemyBase extends Entity {
  constructor(x, y) {
    super(x, y);
    this.kind = 'ENEMY';
    this.canShoot = false;
    this.lastShotTime = Date.now();
    this.speedY = 15;
  }

  startFall() {
    const id = setInterval(() => {
      if (!this.alive) return clearInterval(id);
      if (this.y < canvas.height - this.height) {
        this.y += this.speedY;
      } else {
        clearInterval(id);
      }
    }, 300);
  }
}

class GreenShip extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.sprite = enemyShipImg;
    this.canShoot = true;
    this.speedY = 10;
    this.startFall();
  }

  fire() {
    const now = Date.now();
    if (!this.canShoot || now - this.lastShotTime < 3000) return;
    objects.push(new EnemyLaser(this.x + 45, this.y + 30));
    this.lastShotTime = now;
  }
}

class UfoShip extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.width = 91;
    this.height = 91;
    this.sprite = enemyUFOImg;
    this.canShoot = true;
    this.startFall();
  }

  fire() {
    const now = Date.now();
    if (!this.canShoot || now - this.lastShotTime < 4000) return;
    objects.push(new EnemyLaser(this.x + 50, this.y + 10));
    this.lastShotTime = now;
  }
}

// 보스 베이스
class BossBase extends Entity {
  constructor(x, y) {
    super(x, y);
    this.kind = 'BOSS';
    this.maxHp = 20;   // 난이도 하향: 30 → 20
    this.hp = 20;
    this.canShoot = false;
    this.lastShotTime = Date.now();
    this.moveDir = 'LEFT';
    this.moveStep = 50;
  }

  damage() {
    this.hp -= 1;
    if (this.hp <= 0) {
      this.alive = false;
    }
  }
}

class TwinBossLeft extends BossBase {
  constructor(x, y) {
    super(x, y);
    this.sprite = enemyBossTwinImg1;
    this.width = 256;
    this.height = 256;
    this.canShoot = true;
    this.moveDir = 'LEFT';

    const id = setInterval(() => {
      if (!this.alive) return clearInterval(id);

      if (this.moveDir === 'LEFT' && this.x - this.moveStep > 0) {
        this.x -= this.moveStep;
      } else if (this.moveDir === 'LEFT') {
        this.moveDir = 'RIGHT';
      } else if (
        this.moveDir === 'RIGHT' &&
        this.x + this.width + this.moveStep < canvas.width / 2
      ) {
        this.x += this.moveStep;
      } else {
        this.moveDir = 'LEFT';
      }
    }, 300);
  }

  fire() {
    const now = Date.now();
    // 난이도 하향: 700ms → 1200ms
    if (!this.canShoot || now - this.lastShotTime < 1200) return;

    const centerX = this.x + 128;
    const baseY = this.y + 236;

    objects.push(new EnemyLaser(centerX, baseY));
    objects.push(new EnemyLaser(centerX - 25, baseY));
    objects.push(new EnemyLaser(centerX + 25, baseY));

    this.lastShotTime = now;
  }
}

class TwinBossRight extends BossBase {
  constructor(x, y) {
    super(x, y);
    this.sprite = enemyBossTwinImg2;
    this.width = 256;
    this.height = 256;
    this.canShoot = true;
    this.moveDir = 'RIGHT';

    const id = setInterval(() => {
      if (!this.alive) return clearInterval(id);

      if (
        this.moveDir === 'RIGHT' &&
        this.x + this.width + this.moveStep < canvas.width
      ) {
        this.x += this.moveStep;
      } else if (this.moveDir === 'RIGHT') {
        this.moveDir = 'LEFT';
      } else if (
        this.moveDir === 'LEFT' &&
        this.x - this.moveStep > canvas.width / 2
      ) {
        this.x -= this.moveStep;
      } else {
        this.moveDir = 'RIGHT';
      }
    }, 300);
  }

  fire() {
    const now = Date.now();
    if (!this.canShoot || now - this.lastShotTime < 1200) return;

    const centerX = this.x + 128;
    const baseY = this.y + 236;

    objects.push(new EnemyLaser(centerX, baseY));
    objects.push(new EnemyLaser(centerX - 25, baseY));
    objects.push(new EnemyLaser(centerX + 25, baseY));

    this.lastShotTime = now;
  }
}

// ===================== 유틸 함수 ===========================
const intersects = (a, b) => {
  return !(
    b.left > a.right ||
    b.right < a.left ||
    b.top > a.bottom ||
    b.bottom < a.top
  );
};

const drawText = (msg, x, y, color = 'red', font = '30px Arial', align = 'left') => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(msg, x, y);
};

// ===================== 전역 상태 ===========================
let canvas, ctx, bgPattern;
let heroImg,
  heroLeftImg,
  heroRightImg,
  heroDamagedImg,
  enemyShipImg,
  enemyUFOImg,
  enemyBossTwinImg1,
  enemyBossTwinImg2,
  lifeImg,
  laserRedImg,
  laserRedShotImg,
  laserGreenImg,
  laserGreenShotImg,
  backgroundImg;

let objects = [];
let hero, wing1, wing2;
let stage = 1;
let enemyCounter = { total: 0, dead: 0 };
let loopId = null;
const bus = new MessageBus();

// ✅ 스테이지 클리어 판정: 살아 있는 ENEMY/BOSS 가 하나도 없으면 true
const allEnemiesCleared = () => {
  return !objects.some(
    (o) => (o.kind === 'ENEMY' || o.kind === 'BOSS') && o.alive
  );
};

// ===================== UI ===========================
const drawLife = () => {
  const start = canvas.width - 180;
  for (let i = 0; i < hero.hp; i++) {
    ctx.drawImage(lifeImg, start + 45 * (i + 1), canvas.height - 37);
  }
};

const drawHud = () => {
  drawLife();
  drawText('Points: ' + hero.score, 10, canvas.height - 20);
  drawText('Kill: ' + hero.killCount, 10, canvas.height - 50);
  drawText('Stage: ' + stage, 10, 30);
  drawText('EnemyDead: ' + enemyCounter.dead, 10, 60);
  drawText('SP: ' + hero.specialCharge + '%', canvas.width - 200, 30);
};

const drawBossHpBar = () => {
  const bosses = objects.filter((o) => o.kind === 'BOSS' && o.alive);
  if (bosses.length === 0) return;

  const boss = bosses[0];
  const ratio = Math.max(0, boss.hp / boss.maxHp);

  const barWidth = canvas.width * 0.6;
  const barX = (canvas.width - barWidth) / 2;
  const barY = 20;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX, barY, barWidth, 10);

  ctx.fillStyle = 'lime';
  ctx.fillRect(barX, barY, barWidth * ratio, 10);
};

const showCenterMessage = (msg, color = 'red') => {
  drawText(msg, canvas.width / 2, canvas.height / 2, color, '30px Arial', 'center');
};

// ===================== 입력 처리 ===========================
const preventScrollKeys = (e) => {
  switch (e.keyCode) {
    case 37:
    case 39:
    case 38:
    case 40:
    case 32:
      e.preventDefault();
      break;
  }
};

window.addEventListener('keydown', preventScrollKeys);

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') bus.emit(EVENTS.MOVE_UP);
  else if (e.key === 'ArrowDown') bus.emit(EVENTS.MOVE_DOWN);
  else if (e.key === 'ArrowLeft') bus.emit(EVENTS.MOVE_LEFT);
  else if (e.key === 'ArrowRight') bus.emit(EVENTS.MOVE_RIGHT);
  else if (e.keyCode === 32) bus.emit(EVENTS.FIRE);
  else if (e.key === 'Enter') bus.emit(EVENTS.RESTART);
  else if (e.key === 'x' || e.key === 'X') bus.emit(EVENTS.SPECIAL); // 필살기
});

// ===================== 공용 로더 ===========================
const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
  });

// 파워업 드랍 헬퍼
const dropRandomPowerUp = (x, y) => {
  const r = Math.random();
  let type;
  if (r < 0.33) type = 'heart';
  else if (r < 0.66) type = 'rapid';
  else type = 'triple';
  objects.push(new PowerUp(x, y, type));
};

// ===================== 게임 로직 ===========================
const isHeroDead = () => hero.hp <= 0;

const updateWorld = () => {
  const players = objects.filter((o) => o.kind === 'PLAYER');
  const enemies = objects.filter((o) => o.kind === 'ENEMY');
  const bosses = objects.filter((o) => o.kind === 'BOSS');
  const playerBullets = objects.filter(
    (o) => o.kind === 'BULLET' && o.owner === 'PLAYER'
  );
  const enemyBullets = objects.filter(
    (o) => o.kind === 'BULLET' && o.owner === 'ENEMY'
  );
  const items = objects.filter((o) => o.kind === 'ITEM');

  // 적/보스 사격
  enemies.forEach((e) => e.fire && e.fire());
  bosses.forEach((b) => b.fire && b.fire());

  // 플레이어 탄환 vs 적/보스
  playerBullets.forEach((b) => {
    enemies.forEach((e) => {
      if (!b.alive || !e.alive) return;
      if (intersects(b.getRect(), e.getRect())) {
        bus.emit(EVENTS.HIT_ENEMY, { bullet: b, enemy: e });
        objects.push(new HitEffect(e.x, e.y, laserRedShotImg));
      }
    });

    bosses.forEach((boss) => {
      if (!b.alive || !boss.alive) return;
      if (intersects(b.getRect(), boss.getRect())) {
        bus.emit(EVENTS.HIT_ENEMY_BOSS, { bullet: b, boss });
        objects.push(new HitEffect(boss.x, boss.y - 80, laserRedShotImg));
      }
    });
  });

  // 적 탄환 vs 플레이어
  enemyBullets.forEach((b) => {
    players.forEach((p) => {
      if (!b.alive || !p.alive) return;
      if (intersects(b.getRect(), p.getRect())) {
        bus.emit(EVENTS.HERO_HIT_BY_LASER, { bullet: b, player: p });
        objects.push(new HitEffect(p.x, p.y, laserGreenShotImg));
      }
    });
  });

  // 적 vs 히어로 충돌 & 바닥 도달
  enemies.forEach((e) => {
    if (!e.alive) return;
    const heroRect = hero.getRect();

    if (intersects(heroRect, e.getRect())) {
      bus.emit(EVENTS.ENEMY_COLLIDE_HERO, { enemy: e });
    }

    if (e.y > canvas.height - e.height) {
      bus.emit(EVENTS.ENEMY_PASS_CANVAS, { enemy: e });
    }
  });

  // 보스 vs 히어로
  bosses.forEach((b) => {
    if (!b.alive) return;
    if (intersects(hero.getRect(), b.getRect())) {
      bus.emit(EVENTS.ENEMY_BOSS_COLLIDE_HERO, { boss: b });
    }
  });

  // 아이템 vs 히어로
  items.forEach((item) => {
    if (!item.alive) return;
    if (intersects(item.getRect(), hero.getRect())) {
      item.alive = false;

      if (item.type === 'heart') {
        // HP 1 회복 (최대 3)
        if (hero.hp < 3) {
          hero.hp += 1;
        }
        // 체력이 2 이상이면 손상 이미지 제거
        if (hero.hp > 1) {
          hero.sprite = heroImg;
          wing1.sprite = heroImg;
          wing2.sprite = heroImg;
        }
      } else if (item.type === 'rapid') {
        // 5초간 빠른 연사
        hero.fireCooldownMax = 100;
        if (hero.rapidTimeout) clearTimeout(hero.rapidTimeout);
        hero.rapidTimeout = setTimeout(() => {
          hero.fireCooldownMax = 500;
        }, 5000);
      } else if (item.type === 'triple') {
        // 5초간 3발 샷
        hero.tripleEndTime = Date.now() + 5000;
      }
    }
  });

  objects = objects.filter((o) => o.alive);
};

// ===================== 스폰 관련 ===========================
const spawnGreenShip = (x, y = 0) => {
  const g = new GreenShip(x, y);
  objects.push(g);
  return g;
};

const spawnUfoShip = (x, y = 0) => {
  const u = new UfoShip(x, y);
  objects.push(u);
  return u;
};

const spawnTwinBoss = (centerX) => {
  const left = new TwinBossLeft(centerX - 256, 0);
  const right = new TwinBossRight(centerX, 0);
  objects.push(left, right);
};

// 스테이지별 적 배치
const setupStageEnemies = () => {
  objects = [];
  enemyCounter = { total: 0, dead: 0 };

  let greenCount = stage * 2;
  let ufoCount = stage * 3;
  let bossCount = 0;

  // 5스테이지: 보스 + 적 수 감소
  if (stage === 5) {
    bossCount = 2;
    spawnTwinBoss(canvas.width / 2);

    // 난이도 하향: 일반 적 수 줄이기
    greenCount = 4;
    ufoCount = 4;
  }

  let delay = 0;
  enemyCounter.total = greenCount + ufoCount + bossCount;

  for (let i = 0; i < ufoCount; i++) {
    const gx = Math.floor(Math.random() * (canvas.width - 98));
    const ux = Math.floor(Math.random() * (canvas.width - 98));

    if (i < greenCount) {
      setTimeout(() => {
        spawnGreenShip(gx);
      }, delay);
    }

    setTimeout(() => {
      spawnUfoShip(ux);
    }, delay);

    delay += 2000;
  }
};

const createPlayer = () => {
  hero = new Player(
    canvas.width / 2 - 45,
    canvas.height - canvas.height / 4
  );

  wing1 = new WingShip(
    canvas.width / 2 + 75,
    canvas.height - canvas.height / 4 + 30
  );
  wing2 = new WingShip(
    canvas.width / 2 - 100,
    canvas.height - canvas.height / 4 + 30
  );

  if (hero.hp > 1) {
    hero.sprite = heroImg;
    wing1.sprite = heroImg;
    wing2.sprite = heroImg;
  } else {
    hero.sprite = heroDamagedImg;
    wing1.sprite = heroDamagedImg;
    wing2.sprite = heroDamagedImg;
  }

  objects.push(hero, wing1, wing2);
};

// ===================== 게임 초기화 & 루프 ===========================
const bindEvents = () => {
  const move = hero.speed;

  bus.on(EVENTS.MOVE_UP, () => {
    hero.y -= move;
    wing1.y -= move;
    wing2.y -= move;
  });

  bus.on(EVENTS.MOVE_DOWN, () => {
    hero.y += move;
    wing1.y += move;
    wing2.y += move;
  });

  bus.on(EVENTS.MOVE_LEFT, () => {
    if (hero.x - move > 0) {
      hero.x -= move;
      wing1.x -= move;
      wing2.x -= move;
    }
  });

  bus.on(EVENTS.MOVE_RIGHT, () => {
    if (hero.x + hero.width + move < canvas.width) {
      hero.x += move;
      wing1.x += move;
      wing2.x += move;
    }
  });

  bus.on(EVENTS.FIRE, () => {
    if (!hero.canShoot()) return;
    hero.shoot();
    wing1.shoot();
    wing2.shoot();
  });

  bus.on(EVENTS.SPECIAL, () => {
    hero.useSpecial();
  });

  bus.on(EVENTS.RESTART, () => {
    restartGame();
  });

  // 적이 바닥에 닿았을 때
  bus.on(EVENTS.ENEMY_PASS_CANVAS, ({ enemy }) => {
  enemy.alive = false;
  enemyCounter.dead += 1;
  hero.takeDamage();

  if (isHeroDead()) {
    bus.emit(EVENTS.GAME_LOSE);
  } else if (allEnemiesCleared()) {
    // 적/보스가 더 이상 하나도 없으면 스테이지 클리어
    bus.emit(EVENTS.GAME_WIN);
  }
});


  // 플레이어 탄환이 적에게
  bus.on(EVENTS.HIT_ENEMY, ({ bullet, enemy }) => {
    if (!bullet.alive || !enemy.alive) return;

    bullet.alive = false;
    enemy.alive = false;
    enemyCounter.dead += 1;
    hero.killCount += 1;
    hero.addScore();
    hero.gainSpecial(10); // 필살기 게이지 증가

    // 본체 기준 파워업 드랍
    if (Math.random() < 0.2) {
      dropRandomPowerUp(enemy.x, enemy.y);
    }

    if (allEnemiesCleared()) {
      bus.emit(EVENTS.GAME_WIN);
    }
  });

  // 플레이어 탄환이 보스에게
  bus.on(EVENTS.HIT_ENEMY_BOSS, ({ bullet, boss }) => {
    bullet.alive = false;
    boss.damage();
    hero.addScore();
    hero.gainSpecial(5); // 보스 피 깎아도 조금씩 충전

    if (!boss.alive && Math.random() < 0.5) {
      dropRandomPowerUp(
        boss.x + boss.width / 2,
        boss.y + boss.height / 2
      );
    }

    if (!boss.alive) {
      enemyCounter.dead += 1;
      hero.killCount += 1;
      hero.gainSpecial(20); // 보스킬 보너스
      if (allEnemiesCleared()) {
        bus.emit(EVENTS.GAME_WIN);
      }
    }
  });

  // 적 탄환이 플레이어에게
  bus.on(EVENTS.HERO_HIT_BY_LASER, ({ bullet }) => {
    bullet.alive = false;
    hero.takeDamage();
    if (isHeroDead()) {
      bus.emit(EVENTS.GAME_LOSE);
    }
  });

  // 적이 몸통박치기
  bus.on(EVENTS.ENEMY_COLLIDE_HERO, ({ enemy }) => {
    enemy.alive = false;
    enemyCounter.dead += 1;
    hero.takeDamage();

    if (isHeroDead()) {
      bus.emit(EVENTS.GAME_LOSE);
    } else if (allEnemiesCleared()) {
      bus.emit(EVENTS.GAME_WIN);
    }
  });

  // 보스가 박치기
  bus.on(EVENTS.ENEMY_BOSS_COLLIDE_HERO, () => {
    hero.takeDamage();
    if (isHeroDead()) {
      bus.emit(EVENTS.GAME_LOSE);
    }
  });

  bus.on(EVENTS.GAME_WIN, () => endGame(true));
  bus.on(EVENTS.GAME_LOSE, () => endGame(false));
};

const startLoop = () => {
  if (loopId) clearInterval(loopId);

  loopId = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    updateWorld();
    drawHud();
    drawBossHpBar();
    objects.forEach((o) => o.draw(ctx));
  }, 100);
};

const endGame = (win) => {
  if (loopId) clearInterval(loopId);

  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (win) {
      if (stage === 5) {
        showCenterMessage(
          'Victory!!! Pew Pew... - Press [Enter] to start a new game Captain Pew Pew',
          'green'
        );
        stage = 1;
      } else {
        stage += 1;
        restartGame();
      }
    } else {
      showCenterMessage(
        'You died !!! Press [Enter] to start a new game Captain Pew Pew',
        'red'
      );
      stage = 1;
    }
  }, 200);
};

const restartGame = () => {
  if (loopId) clearInterval(loopId);
  bus.clear();
  initGame();
  bindEvents();
  startLoop();
};

const initGame = () => {
  objects = [];
  setupStageEnemies();
  createPlayer();
};

// ===================== onload ===========================
window.onload = async () => {
  canvas = document.getElementById('myCanvas');
  ctx = canvas.getContext('2d');

  heroImg = await loadImage('assets/player.png');
  heroLeftImg = await loadImage('assets/playerLeft.png');
  heroRightImg = await loadImage('assets/playerRight.png');
  heroDamagedImg = await loadImage('assets/playerDamaged.png');
  enemyShipImg = await loadImage('assets/enemyShip.png');
  enemyUFOImg = await loadImage('assets/enemyUFO.png');
  enemyBossTwinImg1 = await loadImage('assets/enemyBoss.png');
  enemyBossTwinImg2 = await loadImage('assets/enemyBossTwin2.png');
  laserRedImg = await loadImage('assets/laserRed.png');
  laserRedShotImg = await loadImage('assets/laserRedShot.png');
  laserGreenImg = await loadImage('assets/laserGreen.png');
  laserGreenShotImg = await loadImage('assets/laserGreenShot.png');
  lifeImg = await loadImage('assets/life.png');
  backgroundImg = await loadImage('assets/starBackground.png');

  bgPattern = ctx.createPattern(backgroundImg, 'repeat');

  initGame();
  bindEvents();
  startLoop();
};
