declare function readline(): string;
declare function print(value: string): void;
declare function printErr(message: string): void;

class GameInformation {
  playerCount: number;
  id: number;
  droneCount: number;
  zoneCount: number;
  zones: Array<Zone> = new Array<Zone>();
  drones: DroneTracking;

  constructor() {
    var inputs = readline().split(" ");
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

    this.zones = this.zones.map(zone => {
      var TID = parseInt(readline());
      zone.controlledBy = TID;
      zone.isControlled = TID > 0;
      zone.isControlledByMe = TID === this.id;
      zone.resetCount();
      return zone;
      // ID of the team controlling the zone (0, 1, 2, or 3) or -1 if it is not controlled.
      // The zones are given in the same order as in the initialization.
    });
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

    this.zones = this.zones.map(zone => {
      zone.myDroneCount = zone.droneCounts[this.id];
      zone.highestEnemeyCount = zone.getHighestOcupant(this.id);
      zone.overflow = zone.myDroneCount - zone.highestEnemeyCount;
      return zone;
    })
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

  getExposedZones(): Zone[] {
    return this.zones.filter(
      zone => {
        return (zone.isExposed() && zone.controlledBy !== this.id)
      }
    );
  }

  getTiedMine(): Zone[] {
    return this.zones.filter(zone => zone.isControlledByMe && zone.highestEnemeyCount > 0 && zone.highestEnemeyCount === zone.myDroneCount);
  }

  getMine(): Zone[] {
    return this.zones.filter(zone => zone.isControlledByMe && zone.highestEnemeyCount === 0);
  }

  getTiedZonesNotMine(): Zone[] {
    return this.zones.filter(zone => zone.highestEnemeyCount > 0
      && zone.highestEnemeyCount === zone.myDroneCount &&
      !zone.isControlledByMe);
  }

  getClosestZone(drone: Drone): Zone {
    return this.zones.reduce((zone1, zone2) => Helpers.getClosestZone(zone1, zone2, drone), this.zones[0]);
  }

  getZonesIAmLosing(): Zone[] {
    return this.zones.filter(zone => !zone.isControlledByMe && !zone.isExposed());
  }

  getClosestDrones(zone: Zone): Drone[] {
    const sortedDrones = this.drones[this.id].map(d => d).sort((d1, d2) => Helpers.calculateDistance(d1, zone) - Helpers.calculateDistance(d2, zone));
    return sortedDrones;
  }

  getClosestAvailableDrone(zone: Zone): Drone[] {
    const losingTiedZones = this.getTiedZonesNotMine();
    const mostPolulatedTiedNotMine = losingTiedZones.reduce((z1, z2) => z1.overflow < z2.overflow ? z1 : z2, losingTiedZones[0]);
    const drones = this.drones[this.id].map(d => d);
    drones.sort((d1, d2) => Helpers.calculateDistance(d1, zone) - Helpers.calculateDistance(d2, zone))
      .filter(drone => !drone.currentZone
        || (drone.currentZone.isControlledByMe && drone.currentZone.highestEnemeyCount === 0)
        || (!drone.currentZone.isControlledByMe && drone.currentZone.overflow > 0)
        // || drone.currentZone === mostPolulatedTiedNotMine
      );

    return drones;
  }

  sortByClosest(zones: Zone[], drone: Drone) {
    return zones.sort((zone1, zone2) => Helpers.sortByClosestZone(zone1, zone2, drone));
  }

  prioritizeAndMoveToEasiestZone(): Array<string> {
    let orders: Array<string>;
    const zonesTargeted = new Array<Zone>();

    // Look for exposed zones
    const exposedZones = this.getExposedZones();

    // The remaining drones should fight for other zones
    const zonesThatIAmLosing = this.zones.filter(zone =>
      Helpers.getZonesWhereOutnumbered(zone, this.id)
    );

    const tiedZones = this.zones.filter(zone => zone.getHighestOcupant(this.id) > 0 && zone.getHighestOcupant(this.id) === zone.getDroneCount(this.id));

    orders = this.drones[this.id].map(drone => {

      // Check if the drone is in a zone that is neutral, meaning that if it leaves the zone I will lose it
      if (drone.currentZone !== null && drone.currentZone.isControlledByMe && drone.currentZone.overflow === 0 && this.droneCount > 4) {
        return this.moveToZone(drone.currentZone);
      }

      // tied zone can be left
      if (drone.currentZone && drone.currentZone.isControlledByMe && drone.currentZone.overflow > 0) {
        drone.currentZone.overflow--;
      }


      // Leave losing zone
      if (drone.currentZone !== null && !drone.currentZone.isControlledByMe && drone.currentZone.getHighestOcupant(this.id) > drone.currentZone.getDroneCount(this.id)) {
        //this drone is useless, it should help other people
        if (tiedZones.length > 0) {
          const closestTiedZone = tiedZones.reduce((zone1, zone2) => Helpers.getClosestZone(zone1, zone2, drone), tiedZones[0]);
          return this.moveToZone(closestTiedZone);
        } else {
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
        const highestOccupant = zoneIAmLosing.getHighestOcupant(this.id)
        const mine = zoneIAmLosing.getDroneCount(this.id);
        return this.moveToZone(zoneIAmLosing);
      }


      // Fallback
      const closestZone = this.zones.reduce((zone1, zone2) => Helpers.getClosestZone(zone1, zone2, drone), this.zones[0]);
      return this.moveToZone(closestZone);
    })

    return orders;
  }

  goldStrategy(): string[] {
    const exposedZones = this.getExposedZones();
    const tiedNotMine = this.getTiedZonesNotMine();
    const losingZones = this.getZonesIAmLosing();

    var orders = this.drones[this.id].map(drone => {
      let zone: Zone;

      // drone cant leave
      if (drone.currentZone && drone.currentZone.isControlledByMe && drone.currentZone.overflow === 0 && this.droneCount > 4) {
        return this.moveToZone(drone.currentZone);
      }

      // tied zone can be left
      if (drone.currentZone && drone.currentZone.isControlledByMe && drone.currentZone.overflow > 0) {
        drone.currentZone.overflow--;
      }

      // target closest exposed zone
      if (exposedZones.length > 0) {
        zone = this.sortByClosest(exposedZones, drone).shift();
        return this.moveToZone(zone);
      }

      // target tied zones not controlled by me
      if (tiedNotMine.length > 0) {
        zone = this.sortByClosest(tiedNotMine, drone)[0];
        return this.moveToZone(zone);
      }

      //Zones im losing
      if (losingZones.length > 0) {
        zone = this.sortByClosest(losingZones, drone)[0];
        return this.moveToZone(zone);
      }

      // Fallback
      zone = this.getClosestZone(drone);
      return this.moveToZone(zone);
    });

    return orders;
  }

  pointsAttracting(): string[] {
    const orders = this.drones[this.id].map(drone => this.moveToZone(this.getClosestZone(drone)));
    const requestedDrones: number[] = [];
    const mine = this.getMine();

    // Protecting
    if (mine.length > 0) {
      mine.forEach(zone => {
        const drone = this.getClosestDrones(zone)[0];
        requestedDrones.push(drone.id);
        orders[drone.id] = this.moveToZone(zone);
      });
    }

    
    do {
      const tiedMine = this.getTiedMine();
      const tiedNotMine = this.getTiedZonesNotMine();
      const losingZones = this.getZonesIAmLosing();
      const exposedZones = this.getExposedZones();

      // Exposed
      if (exposedZones.length > 0) {
        exposedZones.forEach(zone => {
          let drone: Drone;
          const closest = this.getClosestAvailableDrone(zone);

          for (let d of closest) {
            if (requestedDrones.indexOf(d.id) === -1) {
              drone = d;
              break;
            }
          }

          if (drone) {
            requestedDrones.push(drone.id);
            orders[drone.id] = this.moveToZone(zone);
          }
        })
      }

      // Tied Mine
      if (tiedMine.length > 0) {
        tiedMine.forEach(zone => {
          const closestDrone = this.getClosestAvailableDrone(zone)[0];
          requestedDrones.push(closestDrone.id);
          orders[closestDrone.id] = this.moveToZone(closestDrone.currentZone);
        })
      }

      // losing
      if (tiedNotMine.length > 0) {
        tiedNotMine.forEach(zone => {
          var offset = Math.abs(zone.overflow) + 1;
          const closestDrones = this.getClosestAvailableDrone(zone);
          let drones: Drone[] = [];
          for (let drone of closestDrones) {
            if (offset > 0 && requestedDrones.indexOf(drone.id) === -1) {
              drones.push(drone);
              offset--;
              break;
            }
          };

          if (drones.length > 0) {
            requestedDrones.push(...drones.map(d => d.id));
            drones.forEach(drone => {
              orders[drone.id] = this.moveToZone(zone);
            })
          }
        })
      }

      // losing
      if (losingZones.length > 0) {
        losingZones.forEach(zone => {
          var offset = Math.abs(zone.overflow) + 1;
          const closestDrones = this.getClosestAvailableDrone(zone);
          let drones: Drone[] = [];
          for (let drone of closestDrones) {
            if (offset > 0 && requestedDrones.indexOf(drone.id) === -1) {
              drones.push(drone);
              offset--;
              break;
            }
          };

          if (drones.length > 0) {
            requestedDrones.push(...drones.map(d => d.id));
            drones.forEach(drone => {
              orders[drone.id] = this.moveToZone(zone);
            })
          }
        })
      }
    } while (requestedDrones.length < this.droneCount);

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
  myDroneCount: number;
  highestEnemeyCount: number;
  overflow: number;
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

  getHighestOcupant(id: number): number {
    var highest = 0;
    for (let x = 0; x < this.droneCounts.length; x++) {
      if (x != id) {
        if (this.droneCounts[x] > highest) {
          highest = this.droneCounts[x];
        }
      }
    }
    return highest;
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
  // const orders = overlord.goldStrategy();
  // const orders = overlord.prioritizeAndMoveToEasiestZone();
  const orders = overlord.pointsAttracting();
  overlord.excecuteOrders(orders);
}