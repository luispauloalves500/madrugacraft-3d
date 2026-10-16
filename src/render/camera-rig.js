// Câmera orbital em terceira pessoa com checagem de obstáculos locais.
// Apenas malhas próximas ao segmento alvo-câmera entram no raycast.
export function distanceToSegmentSquared(point, start, end) {
    const vx=end.x-start.x,vz=end.z-start.z;
    const lengthSq=vx*vx+vz*vz;
    const t=lengthSq?Math.max(0,Math.min(1,((point.x-start.x)*vx+(point.z-start.z)*vz)/lengthSq)):0;
    const dx=point.x-(start.x+vx*t),dz=point.z-(start.z+vz*t);
    return dx*dx+dz*dz;
}
export function selectNearBlockers(entries,start,end,radius=3.0,result=[]) {
    const maxSq=radius*radius;
    result.length=0;
    for (const entry of entries) {
        if (distanceToSegmentSquared(entry,start,end)<=maxSq) result.push(entry.mesh);
    }
    return result;
}
export function createCameraRig({THREE,camera,player,raycaster,getGroundHeight,cameraObstacles,scene}) {
    const cameraTarget=new THREE.Vector3();
    const desired=new THREE.Vector3();
    const direction=new THREE.Vector3();
    const localOrigin=new THREE.Vector3();
    const cameraOffset=new THREE.Vector3(0,1.55,0);
    const nearbyBlockers=[];
    const hits=[];
    const nearby=[];
    let blockers=[];
    let ground=null;
    let cameraDistance=7.6;
    function refreshObstacles() {
        scene.updateMatrixWorld(true);
        // Chamada após a geração da floresta e das ruínas; geometria estática.
        ground=cameraObstacles[0] ?? null;
        blockers=cameraObstacles.slice(1).map(mesh=>{
            if (typeof mesh.getWorldPosition==='function') mesh.getWorldPosition(localOrigin);
            else if(mesh.parent?.position) localOrigin.copy(mesh.parent.position);
            else localOrigin.copy(mesh.position);
            return {mesh,x:localOrigin.x,z:localOrigin.z};
        });
    }
    function update(dt,yaw,pitch) {
        cameraTarget.copy(player.position).add(cameraOffset);
        desired.set(
            player.position.x+Math.sin(yaw)*cameraDistance*Math.cos(pitch),
            player.position.y+3.25+Math.sin(pitch)*5.4,
            player.position.z+Math.cos(yaw)*cameraDistance*Math.cos(pitch)
        );
        desired.y=Math.max(getGroundHeight(desired.x,desired.z)+1.1,desired.y);
        direction.copy(desired).sub(cameraTarget);
        const length=direction.length();
        if (length>0.01) {
            direction.multiplyScalar(1/length);
            raycaster.set(cameraTarget,direction);
            raycaster.far=length;
            nearby.length=0;
            if(ground) nearby.push(ground);
            selectNearBlockers(blockers,cameraTarget,desired,2.1,nearbyBlockers);
            for(const mesh of nearbyBlockers)nearby.push(mesh);
            hits.length=0;
            const intersections=raycaster.intersectObjects(nearby,false,hits);
            if (intersections.length) {
                // Chegada imediata ao objeto, retorno suavizado: sem clipping em galhos.
                const nearest=intersections[0].distance;
                desired.copy(cameraTarget).addScaledVector(direction,Math.max(0.65,nearest-0.35));
                if (camera.position.distanceToSquared(desired)>0.001) {
                    const currentRadius=camera.position.distanceTo(cameraTarget);
                    const limitedRadius=desired.distanceTo(cameraTarget);
                    if(currentRadius>limitedRadius)camera.position.copy(desired);
                }
            }
        }
        camera.position.lerp(desired,1-Math.exp(-10*Math.max(0,dt)));
        camera.lookAt(cameraTarget);
    }
    return {update,refreshObstacles,setDistance(value){cameraDistance=Math.max(3,Math.min(12,value))}};
}
