import Phaser from 'phaser';
import { BUSINESSES, type Business } from '../config/businesses';
import { Marker } from '../entities/Marker';
import { Player } from '../entities/Player';
import { isWalkable } from '../utils/MapBuilder';

export class DeliveryManager {
  private scene: Phaser.Scene;
  private player: Player;
  private currentPickup: Marker | null = null;
  private currentDelivery: Marker | null = null;
  private deliveriesCompleted = 0;
  private deliveriesRequired: number;
  private usedBusinesses: Set<string> = new Set();

  onDeliveryComplete?: (secondsRemaining: number) => void;
  onPickup?: () => void;
  onAllDeliveriesComplete?: () => void;

  constructor(scene: Phaser.Scene, player: Player, deliveriesRequired: number) {
    this.scene = scene;
    this.player = player;
    this.deliveriesRequired = deliveriesRequired;
  }

  start() {
    this.spawnPickup();
  }

  private getRandomBusiness(exclude?: string): Business {
    const available = BUSINESSES.filter(b => !this.usedBusinesses.has(b.id) && b.id !== exclude);
    if (available.length === 0) {
      this.usedBusinesses.clear();
      return BUSINESSES[Math.floor(Math.random() * BUSINESSES.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  private findWalkableNear(tileX: number, tileY: number): { x: number; y: number } {
    // Search in expanding rings for a walkable tile
    for (let r = 0; r < 5; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (isWalkable(tileX + dx, tileY + dy)) {
            return { x: tileX + dx, y: tileY + dy };
          }
        }
      }
    }
    return { x: tileX, y: tileY };
  }

  private spawnPickup() {
    const business = this.getRandomBusiness();
    this.usedBusinesses.add(business.id);

    const pos = this.findWalkableNear(business.mapX, business.mapY);

    this.currentPickup = new Marker(
      this.scene, pos.x, pos.y,
      business.icon, business.name, business.id, 'pickup'
    );
  }

  private handlePickup() {
    if (!this.currentPickup) return;

    const pickupBusiness = this.currentPickup.businessId;
    this.currentPickup.destroy();
    this.currentPickup = null;
    this.player.setHasPackage(true);

    this.onPickup?.();

    // Spawn delivery at a different business
    const deliveryBiz = this.getRandomBusiness(pickupBusiness);
    this.usedBusinesses.add(deliveryBiz.id);

    const pos = this.findWalkableNear(deliveryBiz.mapX, deliveryBiz.mapY);

    this.currentDelivery = new Marker(
      this.scene, pos.x, pos.y,
      deliveryBiz.icon, deliveryBiz.name, deliveryBiz.id, 'delivery'
    );
  }

  private handleDelivery() {
    if (!this.currentDelivery) return;

    this.currentDelivery.destroy();
    this.currentDelivery = null;
    this.player.setHasPackage(false);
    this.deliveriesCompleted++;

    // Get remaining time from scene events
    this.scene.events.emit('delivery-complete');
  }

  private static readonly PICKUP_RADIUS = 32;

  update() {
    const px = this.player.x;
    const py = this.player.y;

    if (this.currentPickup) {
      const dx = px - this.currentPickup.x;
      const dy = py - this.currentPickup.y;
      if (dx * dx + dy * dy < DeliveryManager.PICKUP_RADIUS * DeliveryManager.PICKUP_RADIUS) {
        this.handlePickup();
      }
    } else if (this.currentDelivery) {
      const dx = px - this.currentDelivery.x;
      const dy = py - this.currentDelivery.y;
      if (dx * dx + dy * dy < DeliveryManager.PICKUP_RADIUS * DeliveryManager.PICKUP_RADIUS) {
        this.handleDelivery();
      }
    }
  }

  getDeliveriesCompleted(): number {
    return this.deliveriesCompleted;
  }

  getDeliveriesRequired(): number {
    return this.deliveriesRequired;
  }

  isLevelComplete(): boolean {
    return this.deliveriesCompleted >= this.deliveriesRequired;
  }

  getCurrentTarget(): Phaser.Math.Vector2 | null {
    const target = this.currentDelivery || this.currentPickup;
    if (!target) return null;
    return new Phaser.Math.Vector2(target.x, target.y);
  }

  getCurrentTargetType(): 'pickup' | 'delivery' | null {
    if (this.currentDelivery) return 'delivery';
    if (this.currentPickup) return 'pickup';
    return null;
  }

  startNextDelivery() {
    if (!this.isLevelComplete()) {
      this.spawnPickup();
    }
  }

  destroy() {
    this.currentPickup?.destroy();
    this.currentDelivery?.destroy();
  }
}
