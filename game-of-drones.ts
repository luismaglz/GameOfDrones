declare function readline(): string;
declare function print(value: string): void;
declare function printErr(message: string): void;

class GameInformation {
  playerCount: number;
  id: number;
  droneCount: number;
  zoneCount: number;
  zones: Zone[];
  drones: DroneTracking;

  constructor() {
    var inputs = readline().split(' ');
    this.playerCount = parseInt(inputs[0]); // number of players in the game (2 to 4 players)
    this.id = parseInt(inputs[1]); // ID of your player (0, 1, 2, or 3)
    this.droneCount = parseInt(inputs[2]); // number of drones in each team (3 to 11)
    this.zoneCount = parseInt(inputs[3]); // number of zones on the map (4 to 8)
    this.drones = new DroneTracking();

    for (var i = 0; i < this.playerCount; i++) {
      this.drones[i] = [];
    }

    this.initializeZones();
  }

  initializeZones(): void {
    this.zones = [];

    for (var i = 0; i < this.zoneCount; i++) {
      const inputs = readline().split(' ');
      // corresponds to the position of the center of a zone. A zone is a circle with a radius of 100 units.
      const X = parseInt(inputs[0]);
      const Y = parseInt(inputs[1]);
      this.zones.push(new Zone(X, Y, this.playerCount));
    }
  }

  updateZoneControl(): void {
    this.zones.forEach(zone => {
      var TID = parseInt(readline());
      zone.controlledBy = TID;
      zone.isControlled = TID > 0;
      zone.isControlledByMe = TID === this.id;
      zone.resetCount();
      // ID of the team controlling the zone (0, 1, 2, or 3) or -1 if it is not controlled. 
      // The zones are given in the same order as in the initialization.
    })
  }

  updateDroneTracking(): void {
    // The first D lines contain the coordinates of drones of a player with the ID 0,
    // the following D lines those of the drones of player 1, and thus it continues until the last player.
    for (var player = 0; player < this.playerCount; player++) {
      for (var drone = 0; drone < this.droneCount; drone++) {
        var inputs = readline().split(' ');
        var DX = parseInt(inputs[0]);
        var DY = parseInt(inputs[1]);
        if (this.drones[player][drone]) {
          this.drones[player][drone].x = DX;
          this.drones[player][drone].y = DY;
        } else {
          this.drones[player][drone] = new Drone(DX, DY);
        }
        const d = this.drones[player][drone];
        const zone = this.zones.find(zone => {
          return Helpers.isInZone(d, zone)
        });
        if (zone) {
          zone.droneCounts[player]++;
        }
      }
    }
  }
  moveDrone(x: number, y: number): void {
    print(`${x} ${y}`);
  }

  moveDronesToClosestZone(): void {
    this.drones[this.id].forEach(drone => {
      const freeZones = this.zones
        .filter(zone => zone.isExposed() && !zone.isControlledByMe);
      let closestFreeZone: Zone;
      if (freeZones.length > 0) {
        closestFreeZone =
          freeZones.reduce((previous, next) => Helpers.getClosestZone(previous, next, drone), freeZones[0]);
      }
      if (closestFreeZone) {
        this.moveDrone(closestFreeZone.x, closestFreeZone.y);
      } else {
        let closestImLosing: Zone;
        const closestZonesImLosing = this.zones
          .filter((zone) => Helpers.getZonesWhereOutnumbered(zone, this.id))
        if (closestZonesImLosing.length > 0) {
          closestImLosing = closestZonesImLosing.reduce((previous, next) => Helpers.getClosestZone(previous, next, drone), closestZonesImLosing[0]);
          this.moveDrone(closestImLosing.x, closestImLosing.y);
        } else {
          this.moveDrone(drone.x, drone.y);

        }
      }
    })
  }
}

class Helpers {
  public static calculateDistance(point1: Point, point2: Point): number {
    var a = point1.x - point2.x;
    var b = point1.y - point2.y;
    return Math.sqrt(a * a + b * b);
  }
  public static getZonesWhereOutnumbered(zone: Zone, id: number): boolean {
    let mine = 0;
    let other = -1;
    if (zone.droneCounts[id]) {
      mine = zone.droneCounts[id];
    }
    for (var x = 0; x < zone.droneCounts.length; x++) {
      if (x !== id && zone.droneCounts[x] > other) {
        other = zone.droneCounts[x];
      }
    }
    return other < mine;
  }
  public static isInZone(point1: Point, point2: Point): boolean {
    return this.calculateDistance(point1, point2) < 100;
  }
  public static getClosestZone(previousZone: Zone, zone: Zone, drone: Drone): Zone {
    const previous = Helpers.calculateDistance(drone, previousZone);
    const current = Helpers.calculateDistance(drone, zone);
    return previous < current ? previousZone : zone;
  }
}

class Point {
  x: number;
  y: number;

  constructor(pX: number, pY: number) {
    this.x = pX;
    this.y = pY;
  }
}

class Zone extends Point {
  id: number;
  controlledBy: number;
  isControlled: boolean;
  isControlledByMe: boolean;
  enemyDroneCount: number;
  droneCounts: number[];

  constructor(x: number, y: number, pCount: number) {
    super(x, y);
    this.droneCounts = [];
    for (var p = 0; p < pCount; p++) {
      this.droneCounts.push(0);
    }
  }

  isExposed() {
    return this.droneCounts.reduce((a, b) => a + b, 0) === 0;
  }

  resetCount() {
    this.droneCounts = this.droneCounts.map(c => 0);
  }
}

class Drone extends Point {
  constructor(x: number, y: number) {
    super(x, y);
  }
}

class DroneTracking {
  [playerId: number]: Drone[];
}

const overlord = new GameInformation();

// game loop
while (true) {
  overlord.updateZoneControl();
  overlord.updateDroneTracking();
  overlord.moveDronesToClosestZone();
}