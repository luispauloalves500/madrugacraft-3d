// Índice espacial estático para colisões circulares no plano XZ.
// Mantém a mesma projeção em dois passes da v0.5, mas consulta só células próximas.
export function createCollisionWorld(cellSize = 8) {
  if (!(cellSize > 0)) throw new RangeError('cellSize deve ser positivo');
  const colliders = [];
  const cells = new Map();
  let largestRadius = 0;
  const cell = v => Math.floor(v / cellSize);
  const key = (x,z) => `${x}:${z}`;

  function add(collider) {
    if (!Number.isFinite(collider.x) || !Number.isFinite(collider.z) ||
        !Number.isFinite(collider.radius) || collider.radius < 0)
      throw new TypeError('Collider precisa de x, z, radius válidos');
    const entry = { x: collider.x, z: collider.z, radius: collider.radius };
    colliders.push(entry);
    largestRadius = Math.max(largestRadius, entry.radius);
    const k = key(cell(entry.x),cell(entry.z));
    if (!cells.has(k)) cells.set(k,[]);
    cells.get(k).push(entry);
    return entry;
  }
  function visitNearby(x,z,radius,visitor) {
    const reach = radius + largestRadius;
    for(let gx=cell(x-reach);gx<=cell(x+reach);gx++) {
      for(let gz=cell(z-reach);gz<=cell(z+reach);gz++) {
        const bucket = cells.get(key(gx,gz));
        if (!bucket) continue;
        for(const entry of bucket) if(visitor(entry) === false) return false;
      }
    }
    return true;
  }
  function isPositionFree(x,z,radius=.9) {
    if(Math.abs(x)>108 || Math.abs(z)>108) return false;
    let free=true;
    visitNearby(x,z,radius,obstacle=>{
      if((x-obstacle.x)**2+(z-obstacle.z)**2<(radius+obstacle.radius)**2) {
        free=false;return false;
      }
    });
    return free;
  }
  function resolveCollision(x,z,radius=.45) {
    for(let pass=0;pass<2;pass++) {
      visitNearby(x,z,radius,c=>{
        const dx=x-c.x,dz=z-c.z,min=c.radius+radius;
        const d2=dx*dx+dz*dz;
        if(d2>=min*min) return;
        const distance=Math.sqrt(d2);
        if(distance<.0001) {x+=min;return;}
        x+=dx/distance*(min-distance);
        z+=dz/distance*(min-distance);
      });
    }
    return {x:Math.max(-109,Math.min(109,x)),z:Math.max(-109,Math.min(109,z))};
  }
  return {add,colliders,isPositionFree,resolveCollision};
}
