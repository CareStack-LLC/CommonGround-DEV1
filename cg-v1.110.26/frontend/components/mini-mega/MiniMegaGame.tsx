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
                    // In a real scenario we'd wait, but for testing let's allow single play or wait
                    // setStatus('waiting');
                    // For easier debugging/demo, let's just go to playing if we are connected
                    setStatus('playing');
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
            cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

            mobileInput: 'up' | 'down' | 'left' | 'right' | 'stop' = 'stop';
            partnerPos = { x: 400, y: 300, vx: 0, vy: 0, anim: 'idle' };

            constructor() {
                super({ key: 'MainScene' });
            }

            preload() {
                this.load.image('bg', '/assets/minimega/bg.png');

                // Load Sprite Sheets
                // Assuming the generated sprite sheets are grid-based. 
                // We'll estimate frame dimensions based on typical generation output.
                // If the generated image is e.g. 512x512 with 4x4 grid, frameWidth is 128.
                // Let's rely on standard 32x32 or 64x64 pixel art style if it maintained it.
                // Actually, without knowing exact dimensions, providing frameWidth/height is risky.
                // However, Phaser can handle it if we guess or if the asset is standard.
                // Let's try to load it as a spritesheet with a guess, if it looks wrong we tweak.
                // Based on the 'pixel art' prompt, let's guess 32x32 or 64x64.
                // Let's assume the user's concept art was transformed into a strip or grid.
                // I will assume a frame size of 32x32 for now given 'pixel art'.

                this.load.spritesheet('mini', '/assets/minimega/mini_spritesheet.png', {
                    frameWidth: 32, frameHeight: 32
                });
                this.load.spritesheet('mega', '/assets/minimega/mega_spritesheet.png', {
                    frameWidth: 32, frameHeight: 32
                });
            }

            create() {
                const bg = this.add.image(0, 0, 'bg').setOrigin(0, 0);
                bg.displayWidth = this.sys.canvas.width;
                bg.displayHeight = this.sys.canvas.height;

                // Animations
                this.createAnims('mini');
                this.createAnims('mega');

                const mySprite = isParent ? 'mini' : 'mega';
                const partnerSprite = isParent ? 'mega' : 'mini';

                this.player = this.physics.add.sprite(200, 300, mySprite);
                this.player.setCollideWorldBounds(true);
                this.player.setScale(2);

                this.partner = this.physics.add.sprite(600, 300, partnerSprite);
                this.partner.setCollideWorldBounds(true);
                this.partner.setTint(0xaaaaaa);
                this.partner.setScale(2);

                if (this.input.keyboard) {
                    this.cursors = this.input.keyboard.createCursorKeys();
                }

                this.cameras.main.startFollow(this.player);

                this.time.addEvent({
                    delay: 50,
                    callback: this.broadcastState,
                    callbackScope: this,
                    loop: true
                });
            }

            createAnims(key: string) {
                // Simple 3-frame loop assumption based on "Row 1: Idle, Row 2: Walk, Row 3: Jump" 
                // if the generator followed the typical grid.

                this.anims.create({
                    key: `${key}-idle`,
                    frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
                    frameRate: 8,
                    repeat: -1
                });

                this.anims.create({
                    key: `${key}-walk`,
                    frames: this.anims.generateFrameNumbers(key, { start: 4, end: 7 }),
                    frameRate: 8,
                    repeat: -1
                });

                this.anims.create({
                    key: `${key}-jump`,
                    frames: this.anims.generateFrameNumbers(key, { start: 8, end: 11 }),
                    frameRate: 8,
                    repeat: -1
                });
            }

            update() {
                if (!this.cursors || !this.player) return;

                const speed = 200;
                this.player.setVelocity(0);
                let anim = 'idle';

                if (this.cursors.left.isDown || this.mobileInput === 'left') {
                    this.player.setVelocityX(-speed);
                    this.player.setFlipX(true);
                    anim = 'walk';
                } else if (this.cursors.right.isDown || this.mobileInput === 'right') {
                    this.player.setVelocityX(speed);
                    this.player.setFlipX(false);
                    anim = 'walk';
                }

                if (this.cursors.up.isDown || this.mobileInput === 'up') {
                    this.player.setVelocityY(-speed);
                    anim = 'jump';
                } else if (this.cursors.down.isDown || this.mobileInput === 'down') {
                    this.player.setVelocityY(speed);
                    anim = 'walk';
                }

                const myKey = isParent ? 'mini' : 'mega';
                this.player.play(`${myKey}-${anim}`, true);

                // Partner Interp
                const t = 0.2;
                this.partner.x = Phaser.Math.Linear(this.partner.x, this.partnerPos.x, t);
                this.partner.y = Phaser.Math.Linear(this.partner.y, this.partnerPos.y, t);

                const partnerKey = isParent ? 'mega' : 'mini';
                // this.partner.play(`${partnerKey}-${this.partnerPos.anim || 'idle'}`, true);
                // Simplification: just play walk if moving
                if (Math.abs(this.partner.body!.velocity.x) > 10 || Math.abs(this.partner.body!.velocity.y) > 10) {
                    this.partner.play(`${partnerKey}-walk`, true);
                } else {
                    this.partner.play(`${partnerKey}-idle`, true);
                }
            }

            broadcastState() {
                if (channelRef.current && this.player) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'player-update',
                        payload: {
                            x: this.player.x,
                            y: this.player.y,
                            anim: this.player.anims.currentAnim?.key.split('-')[1] || 'idle'
                        }
                    });
                }
            }

            handlePartnerUpdate(payload: any) {
                this.partnerPos = payload;
            }
        }

        // ... (inside initGame)
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
                    gravity: { y: 0, x: 0 },
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

        // Simulate key presses for the scene update loop
        // Alternatively, expose a `mobileInput` state in the scene
        // For simplicity, let's just communicate direction to scene
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

            {/* Mobile Controls Overlay - Visible only on small screens or touch */}
            <div className="mt-4 md:hidden flex gap-4">
                <div className="flex flex-col items-center gap-2">
                    <button
                        className="w-12 h-12 bg-slate-700/80 rounded-full text-white active:bg-cyan-500"
                        onTouchStart={() => handleMove('up')} onTouchEnd={() => handleMove('stop')}
                    >▲</button>
                    <div className="flex gap-2">
                        <button
                            className="w-12 h-12 bg-slate-700/80 rounded-full text-white active:bg-cyan-500"
                            onTouchStart={() => handleMove('left')} onTouchEnd={() => handleMove('stop')}
                        >◀</button>
                        <button
                            className="w-12 h-12 bg-slate-700/80 rounded-full text-white active:bg-cyan-500"
                            onTouchStart={() => handleMove('down')} onTouchEnd={() => handleMove('stop')}
                        >▼</button>
                        <button
                            className="w-12 h-12 bg-slate-700/80 rounded-full text-white active:bg-cyan-500"
                            onTouchStart={() => handleMove('right')} onTouchEnd={() => handleMove('stop')}
                        >▶</button>
                    </div>
                </div>
            </div>

            <div className="hidden md:flex mt-4 gap-8 text-slate-400 font-medium bg-slate-800/50 px-6 py-3 rounded-full border border-slate-700/50">
                <span className="flex items-center gap-2">🕹️ Arrown Keys to Move</span>
                <span className="flex items-center gap-2">You are: <span className={isParent ? "text-orange-400" : "text-cyan-400"}>{isParent ? 'Mini (Parent)' : 'Mega (Child)'}</span></span>
            </div>
        </div>
    );
}
