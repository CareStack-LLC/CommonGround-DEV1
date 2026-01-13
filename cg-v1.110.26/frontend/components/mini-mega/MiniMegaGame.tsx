'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface MiniMegaGameProps {
    sessionId: string;
    userId: string;
    isParent: boolean;
    onClose: () => void;
}

export default function MiniMegaGame({ sessionId, userId, isParent, onClose }: MiniMegaGameProps) {
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'playing'>('connecting');
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        // Initialize Supabase Channel
        const channel = supabase.channel(`game:${sessionId}`, {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = Object.keys(state);
                if (users.length >= 2) {
                    setStatus('playing');
                } else {
                    setStatus('playing'); // For dev/testing, allow entry. In prod, 'waiting'
                }
            })
            .on('broadcast', { event: 'player-update' }, (payload) => {
                if (gameRef.current) {
                    const scene = gameRef.current.scene.getScene('MainScene') as any;
                    if (scene && scene.handlePartnerUpdate) {
                        scene.handlePartnerUpdate(payload.payload);
                    }
                }
            })
            .on('broadcast', { event: 'world-update' }, (payload) => {
                if (gameRef.current) {
                    const scene = gameRef.current.scene.getScene('MainScene') as any;
                    if (scene && scene.handleWorldUpdate) {
                        scene.handleWorldUpdate(payload.payload);
                    }
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date().toISOString(),
                        role: isParent ? 'parent' : 'child'
                    });
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, [sessionId, userId, isParent]);

    useEffect(() => {
        if (status === 'playing' && !gameRef.current && typeof window !== 'undefined') {
            initGame();
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        }
    }, [status]);

    async function initGame() {
        const Phaser = (await import('phaser')).default;

        class MainScene extends Phaser.Scene {
            player!: Phaser.Physics.Arcade.Sprite;
            partner!: Phaser.Physics.Arcade.Sprite;

            platforms!: Phaser.Physics.Arcade.StaticGroup;
            interactables!: Phaser.Physics.Arcade.StaticGroup;
            bridge!: Phaser.Physics.Arcade.Sprite;

            cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
            mobileInput: 'up' | 'down' | 'left' | 'right' | 'stop' = 'stop';

            // State
            partnerPos = { x: 100, y: 450, vx: 0, vy: 0, anim: 'idle', isCarrying: false };
            isCarrying = false;
            isBeingCarried = false;
            bridgeLowered = false;

            constructor() {
                super({ key: 'MainScene' });
            }

            preload() {
                this.load.image('bg_v2', '/assets/minimega/bg_v2.png');
                this.load.image('tiles', '/assets/minimega/tileset.png');

                // Load Sprite Sheets with estimated frame sizes from the pixel art provided
                // Assuming typical 32x32 or similar. The user provided images look like sheets.
                // We'll guess decent dimensions. If they are rows, we'll slice them.
                this.load.spritesheet('mini', '/assets/minimega/mini_spritesheet_v2.png', { frameWidth: 64, frameHeight: 64 });
                this.load.spritesheet('mega', '/assets/minimega/mega_spritesheet_v2.png', { frameWidth: 80, frameHeight: 80 });
            }

            create() {
                // Background
                const bg = this.add.image(0, 0, 'bg_v2').setOrigin(0, 0);
                bg.displayWidth = 1600; // Double width for scrolling level
                bg.displayHeight = 600;
                this.physics.world.setBounds(0, 0, 1600, 600);

                // Platforms (Level Design)
                this.platforms = this.physics.add.staticGroup();

                // Ground
                this.createPlatform(400, 580, 800, 40);
                this.createPlatform(1200, 580, 800, 40);

                // High platform for Mini
                this.createPlatform(300, 400, 200, 20);

                // Gap that Mega needs to carry Mini over? Or High wall?
                // Big Wall that blocks Mega
                this.createPlatform(600, 450, 40, 300); // Tall wall at x=600

                // Bridge Ramp (Initially Up/Blocking or invisible)
                // Let's make a drawbridge at x=600 that Mega uses to cross `gap` or climb wall?
                // Let's say there's a gap at x=800
                // this.createPlatform(800, 580, 0, 0); // Gap

                // Ramp/Bridge Object
                this.bridge = this.physics.add.sprite(660, 400, 'tiles'); // Placeholder
                this.bridge.setTint(0x8B4513); // Wood color
                this.bridge.setDisplaySize(150, 20);
                this.bridge.setAngle(-45); // Ramp up
                this.bridge.body!.allowGravity = false;
                this.bridge.setImmovable(true);
                this.physics.add.collider(this.bridge, [this.player, this.partner]); // Will add colliders later

                // Interactive Button (Only Mini can reach)
                const button = this.interactables = this.physics.add.staticGroup();
                const btn = button.create(300, 370, 'tiles');
                btn.setTint(0xff0000); // Red button
                btn.setDisplaySize(30, 30);
                btn.refreshBody();

                // Players
                this.createAnims(isParent ? 'mini' : 'mega'); // Create local anims
                this.createAnims(isParent ? 'mega' : 'mini'); // Create partner anims

                const myRole = isParent ? 'mini' : 'mega';
                const partnerRole = isParent ? 'mega' : 'mini';

                this.player = this.physics.add.sprite(100, 500, myRole);
                this.player.setCollideWorldBounds(true);

                this.partner = this.physics.add.sprite(150, 500, partnerRole);
                this.partner.setCollideWorldBounds(true);
                this.partner.setTint(0xdddddd); // Slight dim for partner

                // Physics Properties
                if (myRole === 'mini') {
                    this.player.setScale(1.5);
                    this.player.body!.setSize(30, 30);
                    // Mini: Fast, High Jump
                    // We'll set these dynamically in update
                } else {
                    this.player.setScale(2);
                    this.player.body!.setSize(50, 50);
                    // Mega: Strong, Low Jump
                }

                // Partner physics (kinematic-ish via lerp, but we give it a body for collision)
                this.partner.body!.allowGravity = false; // We sync pos directly

                // Collision
                this.physics.add.collider(this.player, this.platforms);
                this.physics.add.collider(this.player, this.bridge);

                // Interactables
                this.physics.add.overlap(this.player, this.interactables, this.handleInteraction, undefined, this);

                // Camera
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                this.cameras.main.setBounds(0, 0, 1600, 600);

                if (this.input.keyboard) {
                    this.cursors = this.input.keyboard.createCursorKeys();
                }

                // Sync Loop
                this.time.addEvent({
                    delay: 50,
                    callback: this.broadcastState,
                    callbackScope: this,
                    loop: true
                });
            }

            createPlatform(x: number, y: number, w: number, h: number) {
                const p = this.platforms.create(x, y, 'tiles');
                p.setDisplaySize(w, h);
                p.refreshBody();
                return p;
            }

            createAnims(key: string) {
                // If we don't know exact frames, we define a safe default
                this.anims.create({
                    key: `${key}-idle`,
                    frames: this.anims.generateFrameNumbers(key, { start: 0, end: 1 }),
                    frameRate: 4,
                    repeat: -1
                });
                this.anims.create({
                    key: `${key}-walk`,
                    frames: this.anims.generateFrameNumbers(key, { start: 1, end: 3 }),
                    frameRate: 8,
                    repeat: -1
                });
                this.anims.create({
                    key: `${key}-jump`,
                    frames: [{ key, frame: 4 }],
                    frameRate: 1,
                });
            }

            update() {
                if (!this.player) return;

                const role = isParent ? 'mini' : 'mega';
                const speed = role === 'mini' ? 300 : 180;
                const jump = role === 'mini' ? -500 : -350;

                // Carry Logic Local
                if (this.isBeingCarried) {
                    // Lock position to partner
                    this.player.x = this.partner.x;
                    this.player.y = this.partner.y - 60; // On top
                    this.player.setVelocity(0);

                    // Jump to dismount
                    if ((this.cursors.up.isDown || this.mobileInput === 'up')) {
                        this.isBeingCarried = false;
                        this.player.setVelocityY(jump);
                    }
                    return; // Skip normal movement
                }

                // Normal Movement
                let anim = 'idle';
                if (this.cursors.left.isDown || this.mobileInput === 'left') {
                    this.player.setVelocityX(-speed);
                    this.player.setFlipX(true);
                    anim = 'walk';
                } else if (this.cursors.right.isDown || this.mobileInput === 'right') {
                    this.player.setVelocityX(speed);
                    this.player.setFlipX(false);
                    anim = 'walk';
                } else {
                    this.player.setVelocityX(0);
                }

                if ((this.cursors.up.isDown || this.mobileInput === 'up') && this.player.body!.touching.down) {
                    this.player.setVelocityY(jump);
                    anim = 'jump';
                }

                if (!this.player.body!.touching.down && anim !== 'jump') {
                    // anim = 'jump'; // Fall ??
                }

                this.player.play(`${role}-${anim}`, true);

                // --- Carry Check (If I am Mega, check if Mini lands on me) ---
                if (role === 'mega') {
                    // Simple distance check for "Mini on head"
                    // Partner is Mini
                    const dx = Math.abs(this.player.x - this.partner.x);
                    const dy = this.partner.y - this.player.y; // Should be above

                    // We rely on the partner telling us they are being carried? 
                    // Or we detect collision.
                    // Easier: If I am Mega, and Partner (Mini) is very close above me, 
                    // I don't set logic. Logic is driven by Mini deciding to be carried?
                    // Actually, if Mini is on top, Mini sets "isBeingCarried".
                }

                // --- Carry Check (If I am Mini, check if I land on Mega) ---
                if (role === 'mini' && !this.isBeingCarried) {
                    const dx = Math.abs(this.player.x - this.partner.x);
                    const dy = this.player.y - this.partner.y;

                    // Specific hitbox: Mini is within 30px X and ~50-80px above Mega
                    if (dx < 40 && dy > -100 && dy < -40 && this.player.body!.velocity.y > 0) {
                        this.isBeingCarried = true;
                    }
                }

                // Lerp Partner
                const t = 0.2;
                this.partner.x = Phaser.Math.Linear(this.partner.x, this.partnerPos.x, t);
                this.partner.y = Phaser.Math.Linear(this.partner.y, this.partnerPos.y, t);

                // Partner Animation
                const pRole = isParent ? 'mega' : 'mini';
                if (Math.abs(this.partner.x - this.partnerPos.x) > 5) {
                    this.partner.setFlipX(this.partner.x > this.partnerPos.x); // Flip based on movement direction
                    this.partner.play(`${pRole}-walk`, true);
                } else {
                    this.partner.play(`${pRole}-idle`, true);
                }
            }

            handleInteraction(player: any, zone: any) {
                // If Mini touches the button
                if (!this.bridgeLowered) {
                    this.bridgeLowered = true;
                    this.tweens.add({
                        targets: this.bridge,
                        angle: 0, // Flat bridge
                        duration: 1000
                    });

                    // Broadcast world update
                    if (channelRef.current) {
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'world-update',
                            payload: { event: 'bridge-lowered' }
                        });
                    }
                }
            }

            handleWorldUpdate(payload: any) {
                if (payload.event === 'bridge-lowered' && !this.bridgeLowered) {
                    this.bridgeLowered = true;
                    this.tweens.add({
                        targets: this.bridge,
                        angle: 0,
                        duration: 1000
                    });
                }
            }

            handlePartnerUpdate(payload: any) {
                this.partnerPos = payload;
            }

            broadcastState() {
                if (channelRef.current && this.player) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'player-update',
                        payload: {
                            x: this.player.x,
                            y: this.player.y,
                            anim: this.player.anims.currentAnim?.key.split('-')[1] || 'idle',
                            isBeingCarried: this.isBeingCarried
                        }
                    });
                }
            }
        }

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: gameContainerRef.current!,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: 800,
                height: 600,
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 600, x: 0 },
                    debug: false,
                },
            },
            scene: MainScene,
            transparent: true,
            backgroundColor: '#00000000'
        };

        gameRef.current = new Phaser.Game(config);
    }

    // Virtual D-pad handlers
    const handleMove = (direction: 'up' | 'down' | 'left' | 'right' | 'stop') => {
        if (!gameRef.current) return;
        const scene = gameRef.current.scene.getScene('MainScene') as any;
        if (!scene || !scene.player) return;
        scene.mobileInput = direction;
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute top-4 right-4 z-50">
                <button onClick={onClose} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105">
                    Exit
                </button>
            </div>

            <div className="mb-2 text-center shrink-0">
                <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2 drop-shadow-md">
                    Mini & Mega
                </h1>
                <div className="flex items-center justify-center gap-2 text-slate-300 text-sm">
                    {status === 'connecting' && <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>}
                    {status === 'waiting' && <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for Player 2...</>}
                    {status === 'playing' && <span className="text-emerald-400 font-bold">● Game Active</span>}
                </div>
            </div>

            {/* Responsive Game Container */}
            <div
                ref={gameContainerRef}
                className="rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700 bg-slate-800 relative ring-4 ring-slate-900/50 w-full max-w-[800px] aspect-[4/3]"
            >
                {status !== 'playing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800/90 z-10 backdrop-blur-sm">
                        <div className="text-center">
                            <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
                            <p className="text-white font-bold text-xl">
                                Loading World...
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Controls Overlay */}
            <div className="mt-4 md:hidden flex gap-4">
                <div className="flex flex-col items-center gap-2">
                    <button
                        className="w-12 h-12 bg-slate-700/80 rounded-full text-white active:bg-cyan-500 text-xl font-bold"
                        onTouchStart={() => handleMove('up')} onTouchEnd={() => handleMove('stop')}
                    >▲</button>
                    <div className="flex gap-2">
                        <button
                            className="w-12 h-12 bg-slate-700/80 rounded-full text-white active:bg-cyan-500 text-xl font-bold"
                            onTouchStart={() => handleMove('left')} onTouchEnd={() => handleMove('stop')}
                        >◀</button>
                        <button
                            className="w-12 h-12 bg-slate-700/80 rounded-full text-white active:bg-cyan-500 text-xl font-bold"
                            onTouchStart={() => handleMove('down')} onTouchEnd={() => handleMove('stop')}
                        >▼</button>
                        <button
                            className="w-12 h-12 bg-slate-700/80 rounded-full text-white active:bg-cyan-500 text-xl font-bold"
                            onTouchStart={() => handleMove('right')} onTouchEnd={() => handleMove('stop')}
                        >▶</button>
                    </div>
                </div>
            </div>

            <div className="hidden md:flex mt-4 gap-8 text-slate-400 font-medium bg-slate-800/50 px-6 py-3 rounded-full border border-slate-700/50">
                <span className="flex items-center gap-2">🕹️ Arrown Keys to Move</span>
                <span className="flex items-center gap-2">You are: <span className={isParent ? "text-orange-400" : "text-cyan-400"}>{isParent ? 'Mini (Parent)' : 'Mega (Child)'}</span></span>
                {isParent && <span className="text-xs text-slate-500 border-l border-slate-600 pl-4">Tip: Jump on Mega's head to be carried!</span>}
            </div>
        </div>
    );
}
