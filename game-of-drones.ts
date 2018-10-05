///<reference path="definitions.d.ts" />

class GameInformation {
  playerCount: number;
  id: number;
  droneCount: number;
  zoneCount: number;
  zones: Array<Zone> = new Array<Zone>();
  drones: DroneTracking;

  constructor() {
    var inputs = readline().split(" ");
    printErr(JSON.stringify(inputs));
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
    for (var i = 0; i < this.zoneCount; i++) {
      const inputs = readline().split(" ");
      // corresponds to the position of the center of a zone. A zone is a circle with a radius of 100 units.
      const X = parseInt(inputs[0]);
      const Y = parseInt(inputs[1]);
      this.zones.push(new Zone(X, Y, this.playerCount, i));
    }
  }

  updateZoneControl(): void {
    printErr(JSON.stringify(this.zones.map(zone => zone.id + ' ' + zone.controlledBy)));

    this.zones = this.zones.map(zone => {
      var TID = parseInt(readline());
      printErr(JSON.stringify(TID));
      zone.controlledBy = TID;
      zone.isControlled = TID > 0;
      zone.isControlledByMe = TID === this.id;
      zone.resetCount();
      return zone;
      // ID of the team controlling the zone (0, 1, 2, or 3) or -1 if it is not controlled.
      // The zones are given in the same order as in the initialization.
    });
    printErr(JSON.stringify(this.zones.map(zone => zone.id + ' ' + zone.controlledBy)));
  }

  updateDroneTracking(): void {
    // The first D lines contain the coordinates of drones of a player with the ID 0,
    // the following D lines those of the drones of player 1, and thus it continues until the last player.
    for (var player = 0; player < this.playerCount; player++) {
      for (var drone = 0; drone < this.droneCount; drone++) {
        var inputs = readline().split(" ");
        var DX = parseInt(inputs[0]);
        var DY = parseInt(inputs[1]);
        if (this.drones[player][drone]) {
          this.drones[player][drone].x = DX;
          this.drones[player][drone].y = DY;
        } else {
          this.drones[player][drone] = new Drone(DX, DY, drone);
        }
        const d = this.drones[player][drone];
        const zone = this.zones.find(zone => {
          return Helpers.isInZone(d, zone);
        });
        if (zone) {
          zone.droneCounts[player]++;
          d.currentZone = zone;
        } else {
          d.currentZone = null;
        }
      }
    }
  }
  moveDrone(x: number, y: number): void {
    print(`${x} ${y}`);
  }

  moveToZone(zone: Zone): string {
    return `${zone.x} ${zone.y}`;
  }

  moveDronesToClosestZone(): void {
    this.drones[this.id].forEach(drone => {
      const closest = this.zones.sort((zone1, zone2) =>
        Helpers.sortByClosestZone(zone1, zone2, drone)
      )[0];
      this.moveToZone(closest);
    });
  }

  prioritizeAndMoveToEasiestZone(): Array<string> {
    let orders: Array<string>;
    const zonesTargeted = new Array<Zone>();

    // Look for exposed zones
    const exposedZones = this.zones.filter(
      zone => {
        return (zone.isExposed() && zone.controlledBy !== this.id)
      }
    );
    printErr("exposedZones: " + JSON.stringify(exposedZones.map(zone => zone.id)))
    printErr("id: " + this.id);

    // The remaining drones should fight for other zones
    const zonesThatIAmLosing = this.zones.filter(zone =>
      Helpers.getZonesWhereOutnumbered(zone, this.id)
    );

    const tiedZones = this.zones.filter(zone => zone.getHighestOcupant() > 0 && zone.getHighestOcupant() === zone.getDroneCount(this.id));

    orders = this.drones[this.id].map(drone => {

      // Check if the drone is in a zone that is neutral, meaning that if it leaves the zone I will lose it
      if (drone.currentZone !== null && !drone.currentZone.isControlled && this.droneCount > 4) {
        return this.moveToZone(drone.currentZone);
      }

      // Leave losing zone
      if (drone.currentZone !== null && !drone.currentZone.isControlledByMe && drone.currentZone.getHighestOcupant() > drone.currentZone.getDroneCount(this.id)) {
        //this drone is useless, it should help other people
        if (tiedZones.length > 0) {
          const closestTiedZone = tiedZones.reduce((zone1, zone2) => Helpers.getClosestZone(zone1, zone2, drone), tiedZones[0]);
          return this.moveToZone(closestTiedZone);
        }else{
          const leastAmmount = this.zones.reduce((z1, z2) => z1.getTotalDrones() < z2.getTotalDrones() ? z1 : z2, this.zones[0]);
          return this.moveToZone(leastAmmount);
        }
      }


      // If im the only one in the zone
      if (drone.currentZone !== null && drone.currentZone.getTotalDrones() === 1) {
        if (exposedZones.length > 0) {
          exposedZones.sort((zone1, zone2) => Helpers.sortByClosestZone(zone1, zone2, drone));
          const zone = exposedZones.shift();
          return this.moveToZone(zone);
        }
      }

      if (drone.currentZone !== null && drone.currentZone.getDroneCount(this.id) === drone.currentZone.getTotalDrones() && drone.currentZone.getTotalDrones() > 1) {
        if (exposedZones.length > 0) {
          exposedZones.sort((zone1, zone2) => Helpers.sortByClosestZone(zone1, zone2, drone));
          const zone = exposedZones.shift();
          return this.moveToZone(zone);
        }
      }

      // Target Exposed Zones
      if (exposedZones.length > 0) {
        exposedZones.sort((zone1, zone2) => Helpers.sortByClosestZone(zone1, zone2, drone));
        const zone = exposedZones.shift();
        return this.moveToZone(zone);
      }


      // Go to tied zone
      if (drone.currentZone === null) {
        if (tiedZones.length > 0) {
          const closestTiedZone = tiedZones.sort((zone1, zone2) => Helpers.sortByClosestZone(zone1, zone2, drone)).shift();
          return this.moveToZone(closestTiedZone);
        }
      }

      //Look for zones that i am losing, at this point only drones that are not esential should be available to me
      if (zonesThatIAmLosing.length > 0) {
        zonesThatIAmLosing.sort((zone1, zone2) => Helpers.sortByClosestZone(zone1, zone2, drone));
        const zoneIAmLosing = zonesThatIAmLosing.shift();
        const highestOccupant = zoneIAmLosing.getHighestOcupant()
        const mine = zoneIAmLosing.getDroneCount(this.id);
        return this.moveToZone(zoneIAmLosing);
      }


      // Fallback
      const closestZone = this.zones.reduce((zone1, zone2) => Helpers.getClosestZone(zone1, zone2, drone), this.zones[0]);
      return this.moveToZone(closestZone);
    })

    return orders;
  }

  excecuteOrders(orders: Array<string>) {
    orders.forEach(order => print(order));
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
    return this.calculateDistance(point1, point2) <= 100;
  }
  public static getClosestZone(previousZone: Zone, zone: Zone, drone: Drone): Zone {
    const previous = Helpers.calculateDistance(drone, previousZone);
    const current = Helpers.calculateDistance(drone, zone);
    return previous < current ? previousZone : zone;
  }
  public static sortByClosestZone(previousZone: Zone, zone: Zone, drone: Drone): number {
    const previous = Helpers.calculateDistance(drone, previousZone);
    const current = Helpers.calculateDistance(drone, zone);
    return previous - current;
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
  droneCounts: number[];

  constructor(x: number, y: number, pCount: number, id: number) {
    super(x, y);
    this.droneCounts = [];
    this.id = id;
    for (var p = 0; p < pCount; p++) {
      this.droneCounts.push(0);
    }
  }

  isExposed() {
    return this.droneCounts.reduce((a, b) => a + b, this.droneCounts[0]) === 0;
  }

  getHighestOcupant(): number {
    return this.droneCounts.reduce((a, b) => a > b ? a : b, this.droneCounts[0]);
  }

  getDroneCount(id: number): number {
    return this.droneCounts[id];
  }

  getTotalDrones(): number {
    return this.droneCounts.reduce((a, b) => a + b, this.droneCounts[0]);
  }

  resetCount() {
    this.droneCounts = this.droneCounts.map(c => 0);
  }
}

class Drone extends Point {
  currentZone: Zone = null;
  id: number = null;
  constructor(x: number, y: number, id: number) {
    super(x, y);
    this.id = id;
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
  const orders = overlord.prioritizeAndMoveToEasiestZone();
  printErr(JSON.stringify(orders));
  overlord.excecuteOrders(orders);
}
