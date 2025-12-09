import * as T from "../libs/CS559-Three/build/three.module.js";
import { GrObject } from "../libs/CS559-Framework/GrObject.js";

export class OldTrafford extends GrObject {
    constructor(params = {}) {
        // The main stadium group
        const otGroup = new T.Group();
        super("OldTrafford", otGroup);

        const loader = new T.TextureLoader();

        // ---------- FIELD ----------
        const grassLight = loader.load("../texture/grass_light.jpg");
        grassLight.colorSpace = T.SRGBColorSpace;
        const grassDark  = loader.load("../texture/grass_dark.jpg");
        grassDark.colorSpace = T.SRGBColorSpace;

        grassLight.wrapS = grassLight.wrapT = T.RepeatWrapping;
        grassDark.wrapS  = grassDark.wrapT  = T.RepeatWrapping;

        // since stripes run along the long edge (x-direction), repeat textures along z (width)
        grassLight.repeat.set(1, 5);
        grassDark.repeat.set(1, 5);

        const fieldLength = 100;   // long edge
        const fieldWidth  = 60;    // short edge
        const extra = 20; // extra size beyond field
        const stripeCount = 12;    // number of stripes along the long edge
        const stripeLength = (fieldLength + extra) / stripeCount; // +20 to slightly extend beyond field

        for (let i = 0; i < stripeCount; i++) {
        const tex = (i % 2 === 0) ? grassLight : grassDark;
        const mat = new T.MeshStandardMaterial({
            map: tex,
            roughness: 0.8,
            metalness: 0,
        });
        const geo = new T.PlaneGeometry(stripeLength, fieldWidth + extra / 2);
        const stripe = new T.Mesh(geo, mat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.receiveShadow = true;
        stripe.position.x = -(fieldLength + extra) / 2 + stripeLength / 2 + i * stripeLength;
        otGroup.add(stripe);
        }

        // ---------- FIELD LINES ----------
        const lineGroup = new T.Group();
        otGroup.add(lineGroup);

        const lineColor = 0xffffff;
        const lineWidth = 0.3;   // thickness of the white lines

        // Dimensions (scaled to your 100 × 60 field)
        const FIELD_L = fieldLength;  // 100
        const FIELD_W = fieldWidth;   // 60

        // FIFA proportions (scaled)
        const PENALTY_AREA_L = 16.5 * (FIELD_L / 105);   // ~15.7
        const PENALTY_AREA_W = 40.3 * (FIELD_W / 68);     // ~35.5

        const GOAL_AREA_L = 5.5 * (FIELD_L / 105);       // ~5.24
        const GOAL_AREA_W = 18.3 * (FIELD_W / 68);        // ~16.15

        const CENTER_CIRCLE_R = 9.15 * (FIELD_W / 68);    // ~8.07           // ~0.88

        // Helper: Make white rectangular line
        function makeLine(w, h, x, z) {

            const thicknessY = 0.1;

            const geo = new T.BoxGeometry(w, thicknessY, h);
            const mat = new T.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.4,
                metalness: 0
            });

            const mesh = new T.Mesh(geo, mat);

            mesh.position.set(x, thicknessY / 2 + 0.02, z); // float slightly above grass
            mesh.castShadow = false;
            mesh.receiveShadow = false;

            lineGroup.add(mesh);
        }



        // ---------- OUTER BOUNDARY ----------
        makeLine(FIELD_L, lineWidth, 0, -FIELD_W / 2);    // South touchline
        makeLine(FIELD_L, lineWidth, 0,  FIELD_W / 2);    // North touchline
        makeLine(lineWidth, FIELD_W, -FIELD_L / 2, 0);    // West line
        makeLine(lineWidth, FIELD_W,  FIELD_L / 2, 0);    // East line

        // ---------- CENTER LINE ----------
        makeLine(lineWidth, FIELD_W, 0, 0);             // center line

        // ---------- PENALTY AREAS ----------   // right*/
        makeLine(lineWidth, PENALTY_AREA_W, -FIELD_L / 2 + PENALTY_AREA_L, 0);
        makeLine(PENALTY_AREA_L, lineWidth, -FIELD_L / 2 + PENALTY_AREA_L / 2, PENALTY_AREA_W / 2);
        makeLine(PENALTY_AREA_L, lineWidth, -FIELD_L / 2 + PENALTY_AREA_L / 2, -PENALTY_AREA_W / 2);

        makeLine(lineWidth, PENALTY_AREA_W, FIELD_L / 2 - PENALTY_AREA_L, 0);
        makeLine(PENALTY_AREA_L, lineWidth, FIELD_L / 2 - PENALTY_AREA_L / 2, PENALTY_AREA_W / 2);
        makeLine(PENALTY_AREA_L, lineWidth, FIELD_L / 2 - PENALTY_AREA_L / 2, -PENALTY_AREA_W / 2);


        // ---------- GOAL AREAS ----------
        makeLine(lineWidth, GOAL_AREA_W, -FIELD_L / 2 + GOAL_AREA_L, 0);
        makeLine(GOAL_AREA_L, lineWidth, -FIELD_L / 2 + GOAL_AREA_L / 2, GOAL_AREA_W / 2);
        makeLine(GOAL_AREA_L, lineWidth, -FIELD_L / 2 + GOAL_AREA_L / 2, -GOAL_AREA_W / 2);

        makeLine(lineWidth, GOAL_AREA_W, FIELD_L / 2 - GOAL_AREA_L, 0);
        makeLine(GOAL_AREA_L, lineWidth, FIELD_L / 2 - GOAL_AREA_L / 2, GOAL_AREA_W / 2);
        makeLine(GOAL_AREA_L, lineWidth, FIELD_L / 2 - GOAL_AREA_L / 2, -GOAL_AREA_W / 2);

        // ---------- CENTER CIRCLE ----------
        const circleThickness = 0.3; 
        const innerR = CENTER_CIRCLE_R - circleThickness;
        const outerR = CENTER_CIRCLE_R;

        const circleGeo = new T.RingGeometry(innerR, outerR, 64);
        const circleMat = new T.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.6,
            roughness: 1,
            metalness: 0,
            side: T.DoubleSide
        });

        const circle = new T.Mesh(circleGeo, circleMat);
        circle.rotation.x = -Math.PI / 2;
        circle.position.y = 0.02;
        lineGroup.add(circle);

        // ---------- REALISTIC GOALS ----------
        function makeGoal(facing) {
            // facing = +1 (goal at -FIELD_L/2, facing +X)
            // facing = -1 (goal at +FIELD_L/2, facing -X)

            const goal = new T.Group();

            const POST_D = 0.6;
            const GOAL_W = 20.32;
            const GOAL_H = 10.55;
            const GOAL_D = 6.0;

            const mat = new T.MeshStandardMaterial({
                color: "white",
                roughness: 0.4,
                metalness: 0.1
            });

            // Vertical posts
            const postGeo = new T.CylinderGeometry(POST_D/2, POST_D/2, GOAL_H, 16);
            const leftPost = new T.Mesh(postGeo, mat);
            leftPost.position.set(0, GOAL_H/2,  GOAL_W/2);
            goal.add(leftPost);

            const rightPost = new T.Mesh(postGeo, mat);
            rightPost.position.set(0, GOAL_H/2, -GOAL_W/2);
            goal.add(rightPost);

            // Crossbar
            const barGeo = new T.CylinderGeometry(POST_D/2, POST_D/2, GOAL_W, 16);
            const crossbar = new T.Mesh(barGeo, mat);
            crossbar.rotation.x = Math.PI / 2;
            crossbar.position.set(0, GOAL_H, 0);
            goal.add(crossbar);

            // Bottom back bar
            const bottomBackBarGeo = new T.CylinderGeometry(POST_D/2, POST_D/2, GOAL_W, 16);
            const bottomBackBar = new T.Mesh(bottomBackBarGeo, mat);
            bottomBackBar.rotation.x = Math.PI / 2;
            bottomBackBar.position.set(-GOAL_D, POST_D/2, 0);
            goal.add(bottomBackBar);

            // Bottom left bar
            const bottomLeftBarGeo = new T.CylinderGeometry(POST_D/2, POST_D/2, GOAL_D, 16);
            const bottomLeftBar = new T.Mesh(bottomLeftBarGeo, mat);
            bottomLeftBar.rotation.z = Math.PI / 2;
            bottomLeftBar.position.set(-GOAL_D/2, POST_D/2, GOAL_W/2);
            goal.add(bottomLeftBar);

            // Bottom right bar
            const bottomRightBarGeo = new T.CylinderGeometry(POST_D/2, POST_D/2, GOAL_D, 16);
            const bottomRightBar = new T.Mesh(bottomRightBarGeo, mat);
            bottomRightBar.rotation.z = Math.PI / 2;
            bottomRightBar.position.set(-GOAL_D/2, POST_D/2, -GOAL_W/2);
            goal.add(bottomRightBar);

            // Bar connecting bottom back to left post
            const backToLeftBarGeo = new T.CylinderGeometry(POST_D/2, POST_D/2, Math.sqrt(GOAL_D*GOAL_D + (GOAL_W/2)*(GOAL_W/2)), 16);
            const backToLeftBar = new T.Mesh(backToLeftBarGeo, mat);
            backToLeftBar.rotation.z = -Math.atan(GOAL_D / GOAL_H);
            backToLeftBar.position.set(-GOAL_D/2, GOAL_H/2, GOAL_W/2);
            goal.add(backToLeftBar);

            // Bar connecting bottom back to right post
            const backToRightBarGeo = new T.CylinderGeometry(POST_D/2, POST_D/2, Math.sqrt(GOAL_D*GOAL_D + (GOAL_W/2)*(GOAL_W/2)), 16);
            const backToRightBar = new T.Mesh(backToRightBarGeo, mat);
            backToRightBar.rotation.z = -Math.atan(GOAL_D / GOAL_H);
            backToRightBar.position.set(-GOAL_D/2, GOAL_H/2, -GOAL_W/2);
            goal.add(backToRightBar);

            // netting (simple version)
            const netGeo = new T.PlaneGeometry(GOAL_W, Math.sqrt(GOAL_D*GOAL_D + GOAL_H*GOAL_H), 4, 4);
            const netMat = new T.MeshStandardMaterial({
                color: "#dddddd",
                side: T.DoubleSide,
                transparent: true,
                opacity: 0.6,
                roughness: 1,
                metalness: 0
            });
            
            const netBack = new T.Mesh(netGeo, netMat);
            const dir = new T.Vector3(0, 1, 0);
            dir.applyQuaternion(backToRightBar.quaternion);
            dir.applyAxisAngle(new T.Vector3(0, 0, 1), Math.PI/2);
            netBack.lookAt(netBack.position.clone().add(dir));

            netBack.position.set(-GOAL_D/2, GOAL_H/2, 0);
            goal.add(netBack);

            // ---------- Triangular side nets ----------
            function addTriangularSideNet(x0, y0, z0, depth, height, flipZ = false) {
                // Create a triangular geometry for the side net
                const triGeo = new T.BufferGeometry();
                const vertices = new Float32Array([
                    0, 0, 0,
                    flipZ ? -depth : depth, 0, 0,
                    0, height, 0
                ]);
                triGeo.setAttribute('position', new T.BufferAttribute(vertices, 3));
                triGeo.computeVertexNormals();

                const triNet = new T.Mesh(triGeo, netMat);
                triNet.position.set(x0, y0, z0);
                goal.add(triNet);
            }

            // Left triangular net
            addTriangularSideNet(0, 0, -GOAL_W / 2, GOAL_D, GOAL_H, facing);

            // Right triangular net
            addTriangularSideNet(0, 0, GOAL_W / 2, GOAL_D, GOAL_H, facing);

            // Rotate to face correct direction
            goal.rotation.y = facing === 1 ? 0 : Math.PI;

            return goal;
        }


        // ---------- Place Goals ----------

        // Left goal (at x = -50), facing +X
        const goalLeft = makeGoal(+1);
        goalLeft.position.set(-FIELD_L/2, 0, 0);
        otGroup.add(goalLeft);

        // Right goal (at x = +50), facing -X
        const goalRight = makeGoal(-1);
        goalRight.position.set(FIELD_L/2, 0, 0);
        otGroup.add(goalRight);


         // ---------- FOOTBALL ----------
        const ballRadius = 1.2;
        const ballGeo = new T.SphereGeometry(ballRadius, 32, 16);
        const ballTex = loader.load("../texture/pattern.png");
        ballTex.colorSpace = T.SRGBColorSpace;
        ballTex.wrapS = T.RepeatWrapping;
        ballTex.wrapT = T.RepeatWrapping;
        ballTex.repeat.set(4, 4);
        const ballMat = new T.MeshStandardMaterial({
            map: ballTex,
            metalness: 0.2,
            roughness: 0.4
        });

        const ball = new T.Mesh(ballGeo, ballMat);
        ball.castShadow = true;
        ball.receiveShadow = true;

        // start in the center circle
        ball.position.set(0, ballRadius + 0.05, 0);
        otGroup.add(ball);

        // store references for animation / physics
        this._ball = ball;
        this._ballRadius = ballRadius;

        // initial velocity (you can tweak or set via params)
         const dir = new T.Vector3(1, 0, 0.4).normalize();

        // Scalar speed parameter to regularize initial speed
        const speed =
            params.ballSpeed !== undefined ? params.ballSpeed : 20;

        // Initial velocity = direction * speed
        this._ballVel = dir.clone().multiplyScalar(speed);

        // field bounds for bouncing (slightly inside the white lines)
        this._fieldHalfL = FIELD_L / 2 - 2;  // X-direction
        this._fieldHalfW = FIELD_W / 2 - 2;  // Z-direction

        // friction (velocity decay) and bounce coefficient
        this._friction = params.friction || 0.0;       // larger = slows faster
        this._restitution = 0.8;    // 1.0 = perfectly elastic, <1 = loses energy

        // ---------- Stands Helper ----------
        // helper: create an InstancedMesh from rowInfos
        function createInstancedSeats(rowInfos, seatGeo, seatMat) {
            if (!rowInfos || rowInfos.length === 0) return null;
            const inst = new T.InstancedMesh(seatGeo, seatMat, rowInfos.length);
            inst.instanceMatrix.setUsage(T.DynamicDrawUsage);
            inst.castShadow = false;
            inst.receiveShadow = false;
            const dummy = new T.Object3D();
            for (let i = 0; i < rowInfos.length; i++) {
                const r = rowInfos[i];
                if (r.orient === "x") {
                    dummy.position.set(r.start, r.y, r.z);
                    dummy.rotation.set(0, r.rotY || 0, 0);
                } else {
                    dummy.position.set(r.x, r.y, r.start);
                    dummy.rotation.set(0, r.rotY || 0, 0);
                }
                dummy.updateMatrix();
                inst.setMatrixAt(i, dummy.matrix);
            }
            inst.instanceMatrix.needsUpdate = true;
            return inst;
        }

        // ---------- North/South STANDS ----------
        function buildNSStands() {
            const standsGroup = new T.Group();

            // Parameters
            const tierCount = 20;
            const extraTopRows = Math.max(4, Math.floor(tierCount * 0.5));
            const totalRows = tierCount + extraTopRows;   // integrated rows
            const riser = 0.6;                           // vertical rise per row
            const tread = 0.9;                            // horizontal depth per row
            const seatW = 0.5;
            const seatD = 0.5;
            const seatH = 0.4;
            const aisleEvery = 10;                        // create aisle every N seats                   // leave corners clear for aisles (meters)

            // Field-related sizes (from outer scope)
            const fieldEdgeZ = FIELD_W / 2 - 1;
            const usableLength = (FIELD_L + extra); // length along x available for seating

            // Trapezoid geometry: near-field short base (innerBase), outer-field long base (outerBase)
            const innerBase = Math.max(usableLength, seatW); // central rectangular width
            const outerBase = usableLength * 1.5;

            const seatMat = new T.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.7 }); // red seats
            const stepMat = new T.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
            const supportMat = new T.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });

            const seatGeoNS = new T.BoxGeometry(seatW * 0.9, seatH, seatD * 0.9);

            function makeSideStand(dirZ = -1) {
                const side = new T.Group();
                const rowInfos = [];

                // For each row compute trapezoid row length (linearly interpolate innerBase->outerBase)
                for (let row = 0; row < totalRows; row++) {
                    const t = totalRows === 1 ? 0 : row / (totalRows - 1);
                    const rowLen = innerBase + (outerBase - innerBase) * t; // full row length this level
                    const sideExtra = Math.max(0, (rowLen - innerBase) / 2); // half width on each side that forms triangles

                    const y = (row + 0.5) * riser;
                    const depthOffset = row * tread;

                    // step geometry for this row
                    const stepGeo = new T.BoxGeometry(rowLen, 0.12, seatD + 0.2);
                    const step = new T.Mesh(stepGeo, stepMat);
                    step.position.set(0, row * riser + 0.06, dirZ * (fieldEdgeZ + extra / 3 + depthOffset));
                    step.receiveShadow = true;
                    side.add(step);

                    // --- CENTER RECTANGLE SEATS (collect, do NOT create meshes) ---
                    const centerSeats = Math.max(1, Math.floor(innerBase / seatW));
                    const centerStartX = -innerBase / 2 + seatW / 2;
                    for (let i = 0; i < centerSeats; i++) {
                        if (aisleEvery > 0 && (i % aisleEvery) === (aisleEvery - 1)) continue;
                        const sx = centerStartX + i * seatW;
                        rowInfos.push({
                            orient: "x",
                            start: sx,
                            y: y,
                            z: dirZ * (fieldEdgeZ + extra / 3 + depthOffset + seatD / 2),
                            rotY: 0
                        });
                    }

                    // --- LEFT TRIANGULAR SIDE (collect) ---
                    if (sideExtra > 0) {
                        const leftSideSeatsCount = Math.max(0, Math.floor(sideExtra / seatW));
                        const leftStartX = -innerBase / 2 - seatW / 2;
                        for (let s = 0; s < leftSideSeatsCount; s++) {
                            if (aisleEvery > 0 && (s % aisleEvery) === (aisleEvery - 1)) continue;
                            const sx = leftStartX - s * seatW;
                            rowInfos.push({
                                orient: "x",
                                start: sx,
                                y: y,
                                z: dirZ * (fieldEdgeZ + extra / 3 + depthOffset + seatD / 2),
                                rotY: 0
                            });
                        }
                    }

                    // --- RIGHT TRIANGULAR SIDE (collect) ---
                    if (sideExtra > 0) {
                        const rightSideSeatsCount = Math.max(0, Math.floor(sideExtra / seatW));
                        const rightStartX = innerBase / 2 + seatW / 2;
                        for (let s = 0; s < rightSideSeatsCount; s++) {
                            if (aisleEvery > 0 && (s % aisleEvery) === (aisleEvery - 1)) continue;
                            const sx = rightStartX + s * seatW;
                            rowInfos.push({
                                orient: "x",
                                start: sx,
                                y: y,
                                z: dirZ * (fieldEdgeZ + extra / 3 + depthOffset + seatD / 2),
                                rotY: 0
                            });
                        }
                    }

                    // front rail for the row
                    const railGeo = new T.BoxGeometry(rowLen, 0.08, 0.06);
                    const rail = new T.Mesh(railGeo, supportMat);
                    rail.position.set(0, row * riser + 0.12, dirZ * (fieldEdgeZ + extra / 3 + depthOffset + stepGeo.parameters.depth / 2 + 0.02));
                    side.add(rail);
                }

                // create instanced seats for this side (single InstancedMesh)
                const instSeats = createInstancedSeats(rowInfos, seatGeoNS, seatMat);
                if (instSeats) side.add(instSeats);

                // supports along outer edge
                const supportSpacing = 6;
                const supportRad = 0.2;
                const supHeight = totalRows * riser + 3;
                for (let sx = -usableLength / 2; sx <= usableLength / 2 + 0.1; sx += supportSpacing) {
                    const cylGeo = new T.CylinderGeometry(supportRad, supportRad, supHeight, 12);
                    const cyl = new T.Mesh(cylGeo, supportMat);
                    cyl.position.set(sx, supHeight / 2 - 0.2, dirZ * (fieldEdgeZ + extra / 3 + totalRows * tread + 0.6));
                    cyl.castShadow = true;
                    side.add(cyl);
                }

                // simple top canopy
                const roofDepth = 15;
                const roofGeo = new T.BoxGeometry(outerBase - 3, 0.6, roofDepth);
                const roofMat = new T.MeshStandardMaterial({ color: 0x8b0000, metalness: 0.2, roughness: 0.8 });
                const roof = new T.Mesh(roofGeo, roofMat);
                roof.position.set(0, supHeight + 0.8, dirZ * (fieldEdgeZ + extra / 3 + totalRows * tread - roofDepth / 2 + 1));
                roof.rotation.x = dirZ * 0.06;
                roof.castShadow = true;
                side.add(roof);

                return side;
            }

            // north and south stands
            const north = makeSideStand(-1);
            standsGroup.add(north);

            const south = makeSideStand(1);
            standsGroup.add(south);

            return standsGroup;
        }
        // some parameters
        const tierCount = 20;
        const extraTopRows = Math.max(4, Math.floor(tierCount * 0.5));
        const totalRows = tierCount + extraTopRows;
        const riser = 0.6;
        const tread = 0.9;
        const seatW = 0.5;
        const seatD = 0.5;
        const seatH = 0.4;
        const aisleEvery = 10;
        const cornerMargin = 2;
        // ---------- WEST / EAST STANDS ----------
        function buildWEStands() {
            const standsGroup = new T.Group();

            // Field-related sizes (swap axes)
            const fieldEdgeX = FIELD_L / 2 + extra / 5;
            const usableDepth = (FIELD_W + 14); // length along z available for seating

            // Trapezoid geometry for west/east stands (near-field short base, outer long base)
            const innerBase = Math.max(usableDepth - 2 * cornerMargin, seatW); // central rectangular width (along z)
            const outerBase = usableDepth * 1.55;

            const seatMat = new T.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.7 });
            const stepMat = new T.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
            const supportMat = new T.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });

            const seatGeoWE = new T.BoxGeometry(seatD * 0.9, seatH, seatW * 0.9);

            function makeSideStand(dirX = -1) {
                const side = new T.Group();
                const rowInfos = [];

                for (let row = 0; row < totalRows; row++) {
                    const t = totalRows === 1 ? 0 : row / (totalRows - 1);
                    const rowLen = innerBase + (outerBase - innerBase) * t; // length along z

                    const y = (row + 0.5) * riser;
                    const depthOffset = row * tread;

                    // step geometry (thin in X, long in Z)
                    const stepGeo = new T.BoxGeometry(seatD + 0.2, 0.12, rowLen);
                    const step = new T.Mesh(stepGeo, stepMat);
                    step.position.set(dirX * (fieldEdgeX + extra / 3 + depthOffset), row * riser + 0.06, 0);
                    step.receiveShadow = true;
                    side.add(step);

                    // collect seats across row (along Z) instead of creating individual meshes
                    const totalCols = Math.max(1, Math.floor(outerBase / seatW));
                    const colStartZ = -outerBase / 2 + seatW / 2;
                    const maxZ = usableDepth / 2 - cornerMargin;

                    for (let col = 0; col < totalCols; col++) {
                        const cz = colStartZ + col * seatW;
                        const insideRow = Math.abs(cz) <= (rowLen / 2); // column inside this row's span
                        const isAisle = (aisleEvery > 0) && ((col % aisleEvery) === (aisleEvery - 1));
                        if (!insideRow || isAisle) continue;

                        rowInfos.push({
                            orient: "z",
                            start: cz,
                            x: dirX * (fieldEdgeX + extra / 3 + depthOffset + seatD / 2),
                            y: y,
                            rotY: dirX === -1 ? Math.PI / 2 : -Math.PI / 2
                        });
                    }
                    // front rail (along z)
                    const railGeo = new T.BoxGeometry(0.06, 0.08, rowLen);
                    const rail = new T.Mesh(railGeo, supportMat);
                    rail.position.set(dirX * (fieldEdgeX + extra / 3 + depthOffset + (stepGeo.parameters.width || (seatD + 0.2)) / 2 + 0.02), row * riser + 0.12, 0);
                    side.add(rail);
                }

                // create instanced seats for this side
                const instSeats = createInstancedSeats(rowInfos, seatGeoWE, seatMat);
                if (instSeats) side.add(instSeats);

                // supports along outer edge (arrayed along z)
                const supportSpacing = 6;
                const supportRad = 0.2;
                const supHeight = totalRows * riser + 1;
                for (let sz = -usableDepth / 2; sz <= usableDepth / 2 + 0.1; sz += supportSpacing) {
                    const cylGeo = new T.CylinderGeometry(supportRad, supportRad, supHeight, 12);
                    const cyl = new T.Mesh(cylGeo, supportMat);
                    cyl.position.set(dirX * (fieldEdgeX + extra / 3 + totalRows * tread + 0.6), supHeight / 2 - 0.2, sz);
                    cyl.castShadow = true;
                    side.add(cyl);
                }

                // simple top canopy (aligned along z)
                const roofDepth = 15;
                const roofGeo = new T.BoxGeometry(roofDepth, 0.6, outerBase - roofDepth);
                const roofMat = new T.MeshStandardMaterial({ color: 0x8b0000, metalness: 0.2, roughness: 0.8 });
                const roof = new T.Mesh(roofGeo, roofMat);
                roof.position.set(dirX * (fieldEdgeX + extra / 3 + totalRows * tread - roofDepth / 2 + 1), supHeight + 0.8, 0);
                roof.rotation.z = -dirX * 0.06; // slight tilt
                roof.castShadow = true;
                side.add(roof);

                return side;
            }

            // west stand (x = -half)
            const west = makeSideStand(-1);
            standsGroup.add(west);

            // east stand (x = +half)
            const east = makeSideStand(1);
            standsGroup.add(east);

            return standsGroup;
        }

        // add west/east stands (call after NS stands)
        const weStands = buildWEStands();
        otGroup.add(weStands);

        const nsstands = buildNSStands();
        otGroup.add(nsstands);

        // ---------- LIGHTS ----------
        const sun = new T.DirectionalLight(0xffffff, 1.2);
        sun.position.set(50, 100, 30);
        sun.castShadow = true;
        otGroup.add(sun);

        // outer roof
    {
        const ringRadius = 25;
        const bandHalf = 16;

        const innerR = ringRadius - bandHalf;
        const outerR = ringRadius + bandHalf;
        const segs = 64;
        const startAngle = 0;
        const arcLength = Math.PI / 2; // quarter circle arcs


        const roofTexture = new T.TextureLoader().load("../texture/clean.jpg"); 
        roofTexture.wrapS = T.RepeatWrapping;
        roofTexture.wrapT = T.RepeatWrapping;
        roofTexture.repeat.set(1, 1);
        const arcMat = new T.MeshStandardMaterial({ 
            map: roofTexture,
            side: T.DoubleSide, 
            roughness: 0.8, 
            metalness: 0.05
        });
        const northMat = new T.MeshStandardMaterial({
            color: "#f0ecec",
            side: T.DoubleSide,
            roughness: 0.8,
            metalness: 0.05
        });
        

        const thickness = 10.0;
        const roofY = riser * totalRows + 17 + thickness / 2;
        const inwardOffset = 10;

        const a0 = startAngle;
        const a1 = startAngle + arcLength;
        const shape = new T.Shape();
        shape.moveTo(Math.cos(a0) * outerR, Math.sin(a0) * outerR);
        shape.absarc(0, 0, outerR, a0, a1, false);
        shape.lineTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
        shape.absarc(0, 0, innerR, a1, a0, true);
        shape.closePath();

        const extrudeSettings = {
            steps: segs,
            depth: thickness,
            bevelEnabled: false
        };
        const arcGeo = new T.ExtrudeGeometry(shape, extrudeSettings);
        
        arcGeo.computeVertexNormals();
        arcGeo.computeBoundingBox();
        const bb = arcGeo.boundingBox;
        const size = new T.Vector3();
        bb.getSize(size);
        const pos = arcGeo.attributes.position;
        const uvs = [];
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const u = size.x > 0 ? (x - bb.min.x) / size.x : 0.5;
            const v = size.z > 0 ? (z - bb.min.z) / size.z : 0.5;
            uvs.push(u, v);
        }
        arcGeo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
        
        

        // SE corner
        const arcMesh = new T.Mesh(arcGeo, arcMat);
        arcMesh.rotation.x = Math.PI / 2;
        arcMesh.position.y = roofY - thickness / 2;
        arcMesh.position.x = FIELD_L / 2 + extra - inwardOffset;
        arcMesh.position.z = FIELD_W / 2 + extra - inwardOffset;
        arcMesh.receiveShadow = true;
        arcMesh.castShadow = true;
        otGroup.add(arcMesh);

        const arcMesh2 = arcMesh.clone();
        // SW corner
        arcMesh2.position.x = - (FIELD_L / 2 + extra - inwardOffset);
        arcMesh2.rotation.z = Math.PI / 2;
        otGroup.add(arcMesh2);

        // NW corner
        const arcMesh3 = arcMesh.clone();
        arcMesh3.position.x = - (FIELD_L / 2 + extra - inwardOffset);
        arcMesh3.position.z = - (FIELD_W / 2 + extra - inwardOffset);
        arcMesh3.rotation.z = Math.PI;
        otGroup.add(arcMesh3);

        // NE corner
        const arcMesh4 = arcMesh.clone();
        arcMesh4.position.z = - (FIELD_W / 2 + extra - inwardOffset);
        arcMesh4.rotation.z = -Math.PI / 2;
        otGroup.add(arcMesh4);

        // South roof
        const srGeo = new T.BoxGeometry(FIELD_L + (extra - inwardOffset) * 2, thickness, bandHalf * 2);
        const srMesh = new T.Mesh(srGeo, arcMat);
        srMesh.position.set(0, roofY - thickness, FIELD_W / 2 + (extra - inwardOffset) + outerR - bandHalf);
        srMesh.receiveShadow = true;
        srMesh.castShadow = true;
        otGroup.add(srMesh);

        // West roof
        const wrGeo = new T.BoxGeometry(bandHalf * 2, thickness, FIELD_W + (extra - inwardOffset) * 2);
        const wrMesh = new T.Mesh(wrGeo, arcMat);
        wrMesh.position.set(- (FIELD_L / 2 + (extra - inwardOffset) + outerR - bandHalf), roofY - thickness, 0);
        wrMesh.receiveShadow = true;
        wrMesh.castShadow = true;
        otGroup.add(wrMesh);
        
        // East roof
        const erGeo = new T.BoxGeometry(bandHalf * 2, thickness, FIELD_W + (extra - inwardOffset) * 2);
        const erMesh = new T.Mesh(erGeo, arcMat);
        erMesh.position.set(FIELD_L / 2 + (extra - inwardOffset) + outerR - bandHalf, roofY - thickness, 0);
        erMesh.receiveShadow = true;
        erMesh.castShadow = true;
        otGroup.add(erMesh);

        // North roof
        const nrGeo = new T.BoxGeometry(FIELD_L + (extra - inwardOffset) * 2, thickness, bandHalf * 4);
        const nrMesh = new T.Mesh(nrGeo, northMat);
        nrMesh.position.set(0, roofY - thickness + (bandHalf) * Math.sqrt(2), - (FIELD_W / 2 + (extra - inwardOffset) + outerR - bandHalf));
        nrMesh.rotation.x = Math.PI / 8;
        nrMesh.receiveShadow = true;
        nrMesh.castShadow = true;
        otGroup.add(nrMesh);

        // Outer walls
        const wallHeight = roofY - thickness - thickness / 2;
        const wallThickness = 2.0;
        const curtainHeight = wallHeight * 0.7;
        const curtainWidth  = FIELD_L + (extra - inwardOffset) * 2 - 8.0;
        const curtainCenterY = wallHeight - curtainHeight / 2;
        const wallMat = new T.MeshStandardMaterial({ color: "#d17424", side: T.DoubleSide, roughness: 0.9, metalness: 0.1 });
        // South wall
        const swGeo = new T.BoxGeometry(FIELD_L + (extra - inwardOffset) * 2, curtainHeight, wallThickness);
        const swMesh = new T.Mesh(swGeo, wallMat);
        swMesh.position.set(0, wallHeight - curtainHeight / 2, FIELD_W / 2 + (extra - inwardOffset) + outerR - wallThickness / 2);
        swMesh.receiveShadow = true;
        swMesh.castShadow = true;
        otGroup.add(swMesh);

        const nWallHeight = wallHeight + thickness / 2;
        
        // North wall
        const nwGeo = new T.BoxGeometry(FIELD_L + (extra - inwardOffset) * 2, nWallHeight * 2, wallThickness / 2);
        const nwMesh = new T.Mesh(nwGeo, wallMat);
        nwMesh.position.set(0, nWallHeight, - (15.5 + FIELD_W / 2 + (extra - inwardOffset) + outerR - wallThickness / 4));
        nwMesh.receiveShadow = true;
        nwMesh.castShadow = true;
        otGroup.add(nwMesh);

        // West wall
        const wwGeo = new T.BoxGeometry(wallThickness, wallHeight, FIELD_W + (extra - inwardOffset) * 2);
        const wwMesh = new T.Mesh(wwGeo, wallMat);
        wwMesh.position.set(- (FIELD_L / 2 + (extra - inwardOffset) + outerR - wallThickness / 2), wallHeight / 2, 0);
        wwMesh.receiveShadow = true;
        wwMesh.castShadow = true;
        otGroup.add(wwMesh);

        // East wall
        const ewGeo = new T.BoxGeometry(wallThickness, wallHeight, FIELD_W + (extra - inwardOffset) * 2);
        const ewMesh = new T.Mesh(ewGeo, wallMat);
        ewMesh.position.set(FIELD_L / 2 + (extra - inwardOffset) + outerR - wallThickness / 2, wallHeight / 2, 0);
        ewMesh.receiveShadow = true;
        ewMesh.castShadow = true;
        otGroup.add(ewMesh);

        // North west side wall
        const nswGeo = new T.BoxGeometry((extra - inwardOffset) * 2.5, nWallHeight * 2, wallThickness);
        const nswMesh = new T.Mesh(nswGeo, northMat);
        nswMesh.position.set(-FIELD_L / 2 - 9, nWallHeight, - (FIELD_W / 2 + (extra - inwardOffset) + outerR + 2));
        nswMesh.rotation.y = -Math.PI / 2;
        nswMesh.receiveShadow = true;
        nswMesh.castShadow = true;
        otGroup.add(nswMesh);

        // North east side wall
        const neswGeo = new T.BoxGeometry((extra - inwardOffset) * 2.5, nWallHeight * 2, wallThickness);
        const neswMesh = new T.Mesh(neswGeo, northMat);
        neswMesh.position.set(FIELD_L / 2 + 9, nWallHeight, - (FIELD_W / 2 + (extra - inwardOffset) + outerR + 2));
        neswMesh.rotation.y = Math.PI / 2;
        neswMesh.receiveShadow = true;
        neswMesh.castShadow = true;
        otGroup.add(neswMesh);


        // New arc walls
        const RingRadius = 39;
        const BandHalf = 2;

        const InnerR = RingRadius - BandHalf;
        const OuterR = RingRadius + BandHalf;

        const A0 = startAngle;
        const A1 = startAngle + arcLength;
        const Shape = new T.Shape();
        Shape.moveTo(Math.cos(A0) * OuterR, Math.sin(A0) * OuterR);
        Shape.absarc(0, 0, OuterR, A0, A1, false);
        Shape.lineTo(Math.cos(A1) * InnerR, Math.sin(A1) * InnerR);
        Shape.absarc(0, 0, InnerR, A1, A0, true);
        Shape.closePath();

        const ExtrudeSettings = {
            steps: segs,
            depth: wallHeight,
            bevelEnabled: false
        };
        const ArcGeo = new T.ExtrudeGeometry(Shape, ExtrudeSettings);
        ArcGeo.computeVertexNormals();

        // SE corner wall
        const searcMesh = new T.Mesh(ArcGeo, wallMat);
        searcMesh.rotation.x = Math.PI / 2;
        searcMesh.position.y = wallHeight;
        searcMesh.position.x = FIELD_L / 2 + extra - inwardOffset;
        searcMesh.position.z = FIELD_W / 2 + extra - inwardOffset;
        searcMesh.receiveShadow = true;
        searcMesh.castShadow = true;
        otGroup.add(searcMesh);

        // SW corner wall
        const swarcMesh = searcMesh.clone();
        swarcMesh.position.x = - (FIELD_L / 2 + extra - inwardOffset);
        swarcMesh.rotation.z = Math.PI / 2;
        otGroup.add(swarcMesh);

        // NW corner wall
        const nwarcMesh = searcMesh.clone();
        nwarcMesh.position.x = - (FIELD_L / 2 + extra - inwardOffset);
        nwarcMesh.position.z = - (FIELD_W / 2 + extra - inwardOffset);
        nwarcMesh.rotation.z = Math.PI;
        otGroup.add(nwarcMesh);
        
        // NE corner wall
        const nearcMesh = searcMesh.clone();
        nearcMesh.position.z = - (FIELD_W / 2 + extra - inwardOffset);
        nearcMesh.rotation.z = -Math.PI / 2;
        otGroup.add(nearcMesh);

        // ---------- FLAGS ----------
        {
            const poleGroupAll = new T.Group();

            // pole params
            const poleHeight = 30;
            const poleRadius = 0.4;
            const poleMat = new T.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 });

            // flag params
            const flagW = 10.0;
            const flagH = 8.0;
            const flagSegX = 20;
            const flagSegY = 12;
            const flagTex = loader.load("../texture/9787.jpg");
            flagTex.colorSpace = T.SRGBColorSpace;
            flagTex.wrapS = flagTex.wrapT = T.RepeatWrapping;

            // stronger / more natural waving uniforms
            const flagUniforms = {
                time: { value: 0 },
                map: { value: flagTex },
                amplitude: { value: 0.9 },
                frequency: { value: 0.8 },
                speed: { value: 4.5 },
                gustAmp: { value: 0.6 },
                flagWidth: { value: flagW },
                windDir: { value: new T.Vector2(1, 0.1).normalize() }
            };

            const flagVert = `
                uniform float time;
                uniform float amplitude;
                uniform float frequency;
                uniform float speed;
                uniform float gustAmp;
                uniform float flagWidth;
                uniform vec2 windDir;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    float x = position.x;
                    float y = position.y;
                    float w = x * windDir.x + y * windDir.y * 0.12;
                    w = clamp(w, 0.0, flagWidth);
                    float baseWave = sin(w * frequency + time * speed) * amplitude;
                    float ripple = sin(w * (frequency * 2.3) + time * (speed * 1.7)) * (amplitude * 0.28);

                    // Irregular gust modulation
                    float gust = sin(time * 0.23 + x * 0.13) *
                                sin(time * 0.07 + y * 0.03) * gustAmp;
                    float verticalPhase = (y * 0.55);
                    float waved = (baseWave + ripple + gust) * (0.75 + 0.25 * sin(verticalPhase));

                    float flutter = sin(time * 14.0 + x * 18.0) *
                                    0.06 * pow(x / flagWidth, 2.0);
                    float disp = waved + flutter;
                    float anchor = smoothstep(0.0, 0.2 * flagWidth, x);
                    disp *= anchor;
                    float rnd = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);
                    disp *= mix(0.92, 1.05, rnd);
                    vec3 offset = normal * disp;
                    float tip = smoothstep(0.7 * flagWidth, flagWidth, x);
                    offset.z += disp * tip * 0.45;
                    vec3 pos = position + offset;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

                }
            `;
            const flagFrag = `
                uniform sampler2D map;
                varying vec2 vUv;
                void main() {
                    vec4 c = texture2D(map, vUv);
                    if (c.a < 0.05) discard;
                    gl_FragColor = c;
                }
            `;
            const flagMat = new T.ShaderMaterial({
                uniforms: T.UniformsUtils.clone(flagUniforms),
                vertexShader: flagVert,
                fragmentShader: flagFrag,
                side: T.DoubleSide,
                transparent: true
            });

            // helper to create one flagpole+flag at local (x,z) world pos; sideSign: +1 east, -1 west
            function makeFlagPole(worldX, worldZ, sideSign) {
                const g = new T.Group();
                g.position.set(worldX, roofY - thickness / 2, worldZ); // base at roof level

                // pole
                const poleGeo = new T.CylinderGeometry(poleRadius, poleRadius, poleHeight, 10);
                const pole = new T.Mesh(poleGeo, poleMat);
                pole.position.set(0, poleHeight / 2, 0);
                pole.castShadow = true;
                g.add(pole);
                const fg = new T.PlaneGeometry(flagW, flagH, flagSegX, flagSegY);
                fg.translate(flagW / 2, 0, 0);
                const fm = flagMat.clone();
                fm.uniforms.amplitude.value = Math.random() * 0.7 + 0.6;
                fm.uniforms.frequency.value = 0.5 + Math.random() * 0.6;
                fm.uniforms.speed.value = 2.0 + Math.random() * 5.0;
                fm.uniforms.gustAmp.value = 0.4 + Math.random() * 0.6;
                const flag = new T.Mesh(fg, fm);
                flag.position.set(0, poleHeight - 2.0, sideSign * (poleRadius + 0.02));
                flag.castShadow = true;
                flag.receiveShadow = true;

                // update time per-render
                flag.onBeforeRender = function(renderer, scene, cam) {
                    fm.uniforms.time.value = performance.now() / 1000;
                };

                g.add(flag);
                return g;
            }

            // place three poles on West and East roofs
            const spacing = 10;
            // compute z positions along roof length (centered)
            const startZ = -FIELD_W / 2 + spacing;
            const zPositions = [ startZ, 0, FIELD_W / 2 - spacing ];

            // west x is wrMesh.position.x (already created above)
            const westX = wrMesh.position.x;
            for (let i = 0; i < zPositions.length; i++) {
                const zpos = zPositions[i];
                const fp = makeFlagPole(westX, zpos, -1);
                poleGroupAll.add(fp);
            }
            // east x is erMesh.position.x
            const eastX = erMesh.position.x;
            for (let i = 0; i < zPositions.length; i++) {
                const zpos = zPositions[i];
                const fp = makeFlagPole(eastX, zpos, +1);
                poleGroupAll.add(fp);
            }

            otGroup.add(poleGroupAll);
        }
        // ---------- Outer Wall Decorations (windows, doors, etc) ----------
        {
            const decoGroup = new T.Group();

            // materials / textures
            const glassMat = new T.MeshStandardMaterial({ color: "#21dbdf", metalness: 0.1, roughness: 0.25, transparent: true, opacity: 0.65 });
            const glassMat2 = new T.MeshStandardMaterial({ color: "#74e8c2", metalness: 0.2, roughness: 0.3, transparent: true, opacity: 0.7 });
            const frameMat = new T.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
            const doorMat = new T.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.2 });
            const adTex1 = loader.load("../texture/9787.jpg");
            const adTex2 = loader.load("../texture/9787.jpg");
            [adTex1, adTex2].forEach(t => { t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; });

            // --- South wall windows (continuous glass curtain wall) ---

            const curtainZ = swMesh.position.z + wallThickness / 2 + 0.2;
            const glassThickness = 15.0;
            const verticalMullionOffset = 40;
            const glassCurtainGeo = new T.BoxGeometry(curtainWidth - verticalMullionOffset, curtainHeight, glassThickness);
            const glassCurtain = new T.Mesh(glassCurtainGeo, glassMat);
            glassCurtain.position.set(0, curtainCenterY, curtainZ);
            glassCurtain.castShadow = true;
            glassCurtain.receiveShadow = true;
            decoGroup.add(glassCurtain);

            const leftGlassGeo = new T.BoxGeometry(verticalMullionOffset / 2, curtainHeight, glassThickness * 1.1);
            const leftGlass = new T.Mesh(leftGlassGeo, glassMat2);
            leftGlass.position.set(-curtainWidth / 2 + verticalMullionOffset / 4, curtainCenterY, curtainZ);
            leftGlass.castShadow = true;
            leftGlass.receiveShadow = true;
            decoGroup.add(leftGlass);

            const rightGlass = leftGlass.clone();
            rightGlass.position.set(curtainWidth / 2 - verticalMullionOffset / 4, curtainCenterY, curtainZ);
            decoGroup.add(rightGlass);

            const frameThickness = 0.12;
            const frameDepth = glassThickness + 0.02;
            const frameMatThin = frameMat;
            const addMullions = true;
            if (addMullions) {
                const mullionWidth = curtainWidth - verticalMullionOffset;
                const mullionThickness = 0.1;
                const mullionCount = Math.floor(mullionWidth / 4);
                const mullionGeo = new T.BoxGeometry(mullionThickness, curtainHeight + 0.2, frameDepth);
                for (let i = 0; i <= mullionCount; i++) {
                    const x = -mullionWidth / 2 + (i * (mullionWidth / mullionCount));
                    const mull = new T.Mesh(mullionGeo, frameMatThin);
                    mull.position.set(x, curtainCenterY, curtainZ + 0.01);
                    decoGroup.add(mull);
                }
                const extramull = new T.Mesh(mullionGeo, frameMatThin);
                extramull.position.set(-curtainWidth / 2 + verticalMullionOffset / 4, curtainCenterY, curtainZ + 0.01);
                decoGroup.add(extramull);
                const extramull2 = extramull.clone();
                extramull2.position.set(curtainWidth / 2 - verticalMullionOffset / 4, curtainCenterY, curtainZ + 0.01);
                decoGroup.add(extramull2);
                const horizontalMullionCount = Math.floor(curtainHeight / 5);
                const hMullionGeo = new T.BoxGeometry(curtainWidth + 0.2, mullionThickness, frameDepth);
                for (let i = 1; i < horizontalMullionCount; i++) {
                    const y = curtainCenterY - curtainHeight / 2 + (i * (curtainHeight / horizontalMullionCount));
                    const hMull = new T.Mesh(hMullionGeo, frameMatThin);
                    hMull.position.set(0, y, curtainZ + 0.01);
                    decoGroup.add(hMull);
                }

            }
            // --- South shed ---
            const shedDepth = glassThickness - 2.0;
            const shedHeight = (wallHeight - curtainHeight) * 0.1;
            const shedGeo = new T.BoxGeometry(curtainWidth + 8.0, shedHeight, shedDepth);
            const shedMat = new T.MeshStandardMaterial({ color: "#b20000", roughness: 0.9, metalness: 0.2 });
            const shedMesh = new T.Mesh(shedGeo, shedMat);
            shedMesh.position.set(0, wallHeight - curtainHeight - shedHeight / 2, swMesh.position.z + wallThickness / 2 + shedDepth / 2);
            shedMesh.castShadow = true;
            decoGroup.add(shedMesh);


            // --- Main door on South (double door) ---
            const doorGlassMat = new T.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.08,
                roughness: 0.25,
                transparent: true,
                opacity: 0.72
            });
            const doorFrameMat = new T.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.2 });

            // layout for multi-panel doors (centered)
            const doorAreaWidth = FIELD_L + (extra - inwardOffset) * 2;
            const doorAreaHeight = wallHeight - curtainHeight;
            const doorAreaZ = swMesh.position.z + wallThickness / 2;

            const doorCount = 10;
            const gap = 0.06;
            const panelW = (doorAreaWidth - (doorCount - 1) * gap) / doorCount;
            const panelH = doorAreaHeight;
            const panelDepth = 0.12;

            // add each glass panel
            const startX = -doorAreaWidth / 2 + panelW / 2;
            for (let i = 0; i < doorCount; i++) {
                const x = startX + i * (panelW + gap);
                const panelGeo = new T.BoxGeometry(panelW, panelH, panelDepth);
                const panel = new T.Mesh(panelGeo, doorGlassMat);
                panel.position.set(x, panelH / 2, doorAreaZ);
                panel.castShadow = true;
                panel.receiveShadow = true;
                decoGroup.add(panel);

                // add slim vertical frame to the right of each panel (except last) to simulate mullions/frames
                if (i < doorCount - 1) {
                    const vFrameGeo = new T.BoxGeometry(0.06, panelH + 0.08, panelDepth + 0.02);
                    const vFrame = new T.Mesh(vFrameGeo, doorFrameMat);
                    vFrame.position.set(x + (panelW + gap) / 2 - 0.03, panelH / 2, doorAreaZ + 0.01);
                    decoGroup.add(vFrame);
                }
            }

            // left and right edge frames for the whole door bank
            const edgeFrameGeo = new T.BoxGeometry(0.09, panelH + 0.12, panelDepth + 0.04);
            const leftEdge = new T.Mesh(edgeFrameGeo, doorFrameMat);
            leftEdge.position.set(-doorAreaWidth / 2 - 0.045, panelH / 2, doorAreaZ + 0.01);
            decoGroup.add(leftEdge);
            const rightEdge = leftEdge.clone();
            rightEdge.position.set(doorAreaWidth / 2 + 0.045, panelH / 2, doorAreaZ + 0.01);
            decoGroup.add(rightEdge);

            // top transom frame above the doors
            const transomGeo = new T.BoxGeometry(doorAreaWidth + 0.18, 0.08, panelDepth + 0.04);
            const transom = new T.Mesh(transomGeo, doorFrameMat);
            transom.position.set(0, panelH + 0.04, doorAreaZ + 0.01);
            decoGroup.add(transom);

            // --- Billboards / Ads on East & West (large planes) ---
            const boardW = 40;
            const boardH = 30;
            const boardMat1 = new T.MeshStandardMaterial({ map: adTex1, roughness: 0.6, metalness: 0.05, side: T.DoubleSide });
            const boardMat2 = new T.MeshStandardMaterial({ map: adTex2, roughness: 0.6, metalness: 0.05, side: T.DoubleSide });
            const boardHeight = (wallHeight + thickness) / 2 + thickness / 4;
            const boardEast = new T.Mesh(new T.PlaneGeometry(boardW, boardH), boardMat1);
            boardEast.position.set(ewMesh.position.x + wallThickness / 2 + 0.2, boardHeight, FIELD_W / 2);
            boardEast.rotation.y = Math.PI / 2;
            boardEast.receiveShadow = true;
            decoGroup.add(boardEast);
            const boardWest = new T.Mesh(new T.PlaneGeometry(boardW, boardH), boardMat2);
            boardWest.position.set(wwMesh.position.x - wallThickness / 2 - 0.2, boardHeight, FIELD_W / 2);
            boardWest.rotation.y = -Math.PI / 2;
            boardWest.receiveShadow = true;
            decoGroup.add(boardWest);

            // --- Posters on the side of curtain ---
            const posterW = 10.0;
            const posterH = 18.0;
            const boartMat1 = new T.MeshStandardMaterial({ map: adTex1, roughness: 0.7, metalness: 0.1, side: T.DoubleSide });
            const boartMat2 = new T.MeshStandardMaterial({ map: adTex2, roughness: 0.7, metalness: 0.1, side: T.DoubleSide });
            const poster1 = new T.Mesh(new T.PlaneGeometry(posterW, posterH), boartMat1);
            poster1.position.set(-curtainWidth / 2 - posterW / 2 - posterW / 5, curtainCenterY, curtainZ + 0.1);
            poster1.receiveShadow = true;
            decoGroup.add(poster1);
            const poster2 = new T.Mesh(new T.PlaneGeometry(posterW, posterH), boartMat2);
            poster2.position.set(curtainWidth / 2 + posterW / 2 + posterW / 5, curtainCenterY, curtainZ + 0.1);
            poster2.receiveShadow = true;
            decoGroup.add(poster2);


            // --- Canvas signage (generated text) above south wall ---
            const canvas = document.createElement("canvas");
            canvas.width = 2048;
            canvas.height = 256;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#b20000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = "bold 180px sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText("DETINU RETSEHCNAM", canvas.width / 2, 180);
            const signTex = new T.CanvasTexture(canvas);
            signTex.colorSpace = T.SRGBColorSpace;
            const signMat = new T.MeshStandardMaterial({ map: signTex, roughness: 0.7 });
            const sign = new T.Mesh(new T.PlaneGeometry(FIELD_W, thickness * 0.75), signMat);
            sign.position.set(0, wallHeight + thickness / 2, swMesh.position.z + wallThickness / 2 + 0.12);
            sign.receiveShadow = true;
            decoGroup.add(sign);

            // finally add to main group
            otGroup.add(decoGroup);
        }
        {
            // ---------- OUTER DECOS ----------
            // --- Lime pillars at SE corner ---
            const pillarGroup = new T.Group();
            const pillarHeight = roofY;
            const pillarDepth = 8.0;
            const coneHeight = pillarDepth / Math.sqrt(2);
            const pillarMat = new T.MeshStandardMaterial({ color: "#c6c6c6", roughness: 0.9, metalness: 0.2 });
            const upperPillarMat = new T.MeshStandardMaterial({ color: "#f06f58", roughness: 0.8, metalness: 0.3 });
            const pillarGeo = new T.BoxGeometry(pillarDepth, pillarHeight, pillarDepth);
            const pillar1 = new T.Mesh(pillarGeo, pillarMat);
            pillar1.position.set(FIELD_L - pillarDepth * 2, pillarHeight / 2, FIELD_W + pillarDepth * 2);
            pillar1.castShadow = true;
            // place a cone on top of the pillar
            const cone = new T.ConeGeometry(coneHeight, coneHeight, 4);
            const coneMesh = new T.Mesh(cone, upperPillarMat);
            coneMesh.position.set(0, pillarHeight / 2 + coneHeight / 2, 0);
            coneMesh.rotation.y = Math.PI / 4;
            pillar1.add(coneMesh);
            pillarGroup.add(pillar1);

            const pillar2 = pillar1.clone();
            pillar2.position.set(FIELD_L, pillarHeight / 2, FIELD_W);
            pillarGroup.add(pillar2);

            const pillar3 = pillar1.clone();
            pillar3.position.set(-FIELD_L + pillarDepth * 2, pillarHeight / 2, FIELD_W + pillarDepth * 2);
            pillarGroup.add(pillar3);

            const pillar4 = pillar1.clone();
            pillar4.position.set(-FIELD_L, pillarHeight / 2, FIELD_W);
            pillarGroup.add(pillar4);

            otGroup.add(pillarGroup);

            // --- Pillars at W wall and E wall ---
            const sidePillarGroup = new T.Group();
            const sidePillarX = 4.0;
            const sidePillarZ = 8.0;
            const sidePillarNum = 2;
            const lowerY = roofY * 0.6;
            const upperY = roofY * 0.4;
            for (let i = -sidePillarNum; i < sidePillarNum - 1; ++i) {
                const sidePillar = new T.Group();
                const range = (FIELD_W + extra * 2) / sidePillarNum / 2;
                const posX = - (FIELD_L / 2 + (extra - inwardOffset) + outerR + sidePillarX / 2);
                const posZ = i * range;
                const lowerPillarGeo = new T.BoxGeometry(sidePillarX, lowerY, sidePillarZ);
                const lowerPillar = new T.Mesh(lowerPillarGeo, pillarMat);
                lowerPillar.position.set(posX, lowerY / 2, posZ);
                const upperPillarGeo = new T.BoxGeometry(sidePillarX, upperY, sidePillarZ);
                const upperPillar = new T.Mesh(upperPillarGeo, upperPillarMat);
                upperPillar.position.set(posX, upperY / 2 + lowerY, posZ);
                sidePillar.add(upperPillar);
                sidePillar.add(lowerPillar);
                sidePillarGroup.add(sidePillar);
                const upperPillar2 = upperPillar.clone();
                const lowerPillar2 = lowerPillar.clone();
                upperPillar2.position.set(-posX, upperY / 2 + lowerY, posZ);
                lowerPillar2.position.set(-posX, lowerY / 2, posZ);
                const sidePillar2 = new T.Group();
                sidePillar2.add(upperPillar2);
                sidePillar2.add(lowerPillar2);
                sidePillarGroup.add(sidePillar2);

                if (i === sidePillarNum - 2) continue;
                // middle red box
                const midBoxGeo = new T.BoxGeometry(sidePillarX * 0.75, lowerY * 0.6, range);
                const midBoxMat = new T.MeshStandardMaterial({ color: "#ff0000", roughness: 0.9, metalness: 0.2 });
                const midBox = new T.Mesh(midBoxGeo, midBoxMat);
                midBox.position.set(posX, roofY - lowerY * 0.5, posZ + range / 2);
                sidePillarGroup.add(midBox);
                const midBox2 = midBox.clone();
                midBox2.position.set(-posX, roofY - lowerY * 0.5, posZ + range / 2);
                sidePillarGroup.add(midBox2);
                // middle post
                const midPostGeo = new T.CylinderGeometry(sidePillarX * 0.2, sidePillarX * 0.2, range * 1.1, 12);
                const midPostMat = pillarMat;
                const midPost = new T.Mesh(midPostGeo, midPostMat);
                midPost.rotation.x = Math.PI / 2;
                midPost.position.set(posX, lowerY * 0.8, posZ + range / 2);
                const midPostClone = midPost.clone();
                midPostClone.position.set(posX, lowerY * 0.6, posZ + range / 2);
                sidePillarGroup.add(midPostClone);
                sidePillarGroup.add(midPost);
                const midPost2 = midPost.clone();
                midPost2.position.set(-posX, lowerY * 0.8, posZ + range / 2);
                const midPostClone2 = midPostClone.clone();
                midPostClone2.position.set(-posX, lowerY * 0.6, posZ + range / 2);
                sidePillarGroup.add(midPostClone2);
                sidePillarGroup.add(midPost2);
            }
            otGroup.add(sidePillarGroup);
        }
        {
            // ---------- FIREWORKS ----------
            // Firework fountain emitters (flaring fountains)
            // Creates several non-physical emit points around the stadium that continuously spawn particles
            this._fireworksGroup = new T.Group();
            this._fireworksGroup.name = "fireworksGroup";
            this._fireworksGroup.frustumCulled = false; // keep updating even if off-screen

            const particleGeom = new T.SphereGeometry(0.7, 8, 8);

            const createFountainEmitter = (pos, colorHex, options = {}) => {
                const emitter = {
                    pos: pos.clone(),
                    color: new T.Color(colorHex),
                    rate: options.rate || 80,
                    speedMin: options.speedMin || 10,
                    speedMax: options.speedMax || 16,
                    spread: options.spread || 10,
                    lifeMin: options.lifeMin || 1.4,
                    lifeMax: options.lifeMax || 3.0,
                    particles: [],
                    acc: 0
                };
                emitter.spawnOne = () => {
                    const mat = new T.MeshBasicMaterial({
                        color: emitter.color,
                        blending: T.AdditiveBlending,
                        transparent: true,
                        depthWrite: false,
                        depthTest: true,
                        opacity: 1.0
                    });
                    const m = new T.Mesh(particleGeom, mat);
                    m.position.copy(emitter.pos);
                    const vx = (Math.random() * 2 - 1) * emitter.spread;
                    const vz = (Math.random() * 2 - 1) * emitter.spread;
                    const vy = emitter.speedMin + Math.random() * (emitter.speedMax - emitter.speedMin);
                    m.userData = {
                        vel: new T.Vector3(vx, vy, vz),
                        life: emitter.lifeMin + Math.random() * (emitter.lifeMax - emitter.lifeMin),
                        age: 0
                    };
                    this._fireworksGroup.add(m);
                    emitter.particles.push(m);
                };
                emitter.update = (dt) => {
                    emitter.acc += dt * emitter.rate;
                    while (emitter.acc >= 1.0) {
                        emitter.spawnOne();
                        emitter.acc -= 1.0;
                    }
                    for (let i = emitter.particles.length - 1; i >= 0; --i) {
                        const p = emitter.particles[i];
                        const ud = p.userData;
                        const gravity = -3.3 * 0.25;
                        ud.vel.y += gravity * dt;
                        p.position.addScaledVector(ud.vel, dt);
                        ud.age += dt;
                        const lifeRatio = 1.0 - ud.age / ud.life;
                        p.material.opacity = Math.max(0.0, lifeRatio);
                        const scale = Math.max(0.02, lifeRatio);
                        p.scale.setScalar(scale);
                        if (ud.age >= ud.life) {
                            this._fireworksGroup.remove(p);
                            p.geometry && p.geometry.dispose && p.geometry.dispose();
                            p.material && p.material.dispose && p.material.dispose();
                            emitter.particles.splice(i, 1);
                        }
                    }
                };
                return emitter;
            };

            // choose emitter positions around stadium (relative to existing variables)
            const emitterPositions = [
                new T.Vector3(FIELD_L / 2 + extra / 2 - 1, 0, FIELD_W / 2 + extra / 4 - 1),
                new T.Vector3(-FIELD_L / 2 - extra / 2 + 1, 0, FIELD_W / 2 + extra / 4 - 1),
                new T.Vector3(FIELD_L / 2 + extra / 2 - 1, 0, -FIELD_W / 2 - extra / 4 + 1),
                new T.Vector3(-FIELD_L / 2 - extra / 2 + 1, 0, -FIELD_W / 2 - extra / 4 + 1),
                new T.Vector3(0, 0, FIELD_W / 2 + extra / 4 - 1),
                new T.Vector3(0, 0, -FIELD_W / 2 - extra / 4 + 1),
                new T.Vector3(FIELD_L / 4 + extra / 4, 0, FIELD_W / 2 + extra / 4 - 1),
                new T.Vector3(-FIELD_L / 4 - extra / 4, 0, FIELD_W / 2 + extra / 4 - 1),
                new T.Vector3(FIELD_L / 4 + extra / 4, 0, -FIELD_W / 2 - extra / 4 + 1),
                new T.Vector3(-FIELD_L / 4 - extra / 4, 0, -FIELD_W / 2 - extra / 4 + 1)
            ];

            this._emitters = [];
            const colors = [0xffee66, 0xff6666, 0x66ffcc, 0x66aaff, 0xff99ff, 0xffffff];
            for (let i = 0; i < emitterPositions.length; i++) {
                const e = createFountainEmitter(emitterPositions[i], colors[i % colors.length], {
                    rate: 40 - Math.random() * 15,
                    speedMin: 8 + Math.random() * 2,
                    speedMax: 11 + Math.random() * 6,
                    spread: 1.5 + Math.random() * 1.5,
                    lifeMin: 6.6,
                    lifeMax: 9.9
                });
                this._emitters.push(e);
            }

            this._fireworksGroup.visible = true;
            otGroup.add(this._fireworksGroup);
        }
    }
        // ---------- POSITION ----------
        otGroup.position.set(params.x || 0, params.y || 0, params.z || 0);
        otGroup.scale.set(params.scale || 1, params.scale || 1, params.scale || 1);
        this.rideable = goalLeft || false;

        this._stadiumScale = params.scale || 1;
        this._stadiumX = params.x || 0;
        this._stadiumZ = params.z || 0;

        // player reference (set later from main.js)
        this._player = null;
        this._goalKeeper = null;


    }

    addPlayer(player) {
        this._player = player;
    }
    addGoalKeeper(gk) {
        this._goalKeeper = gk;
    }

    stepWorld(delta, timeOfDay) {
        // delta is in seconds (clamp for stability)
        const dt = Math.min(0.05, delta || 0.016);
        if (!this._emitters) return;
        for (let i = 0; i < this._emitters.length; ++i) {
            this._emitters[i].update(dt);
        }

         // --- football physics ---
        if (this._ball && this._ballVel) {
            const v = this._ballVel;

            // friction: dv/dt = -mu * v  -> approximate with scaling per frame
            const mu = this._friction || 0;
            const decay = Math.max(0, 1 - mu * dt);
            v.x *= decay;
            v.z *= decay;

            // if it's basically stopped, zero it out
            if (v.lengthSq() < 0.01) {
                v.set(0, 0, 0);
            }

            const pos = this._ball.position;

            // integrate position (ball stays at constant height)
            pos.x += v.x * dt;
            pos.z += v.z * dt;

            const maxX = this._fieldHalfL - this._ballRadius;
            const maxZ = this._fieldHalfW - this._ballRadius;

            // bounce on X boundaries
            if (pos.x > maxX) {
                pos.x = maxX;
                v.x = -v.x * this._restitution;
            } else if (pos.x < -maxX) {
                pos.x = -maxX;
                v.x = -v.x * this._restitution;
            }

            // bounce on Z boundaries
            if (pos.z > maxZ) {
                pos.z = maxZ;
                v.z = -v.z * this._restitution;
            } else if (pos.z < -maxZ) {
                pos.z = -maxZ;
                v.z = -v.z * this._restitution;
            }

            const goalHalfWidth = 10.5;
            const goalXThreshold = this._fieldHalfL - 1.3;

            const ax = Math.abs(pos.x);
            const az = Math.abs(pos.z);

            if (ax >= goalXThreshold && az <= goalHalfWidth) {
                pos.set(0, this._ballRadius + 0.05, 0);
                v.set(0, 0, 0);
            }


            // only roll if there is horizontal speed
            const speedXZ = Math.sqrt(v.x * v.x + v.z * v.z);
            if (speedXZ > 0.0001) {
                // axis perpendicular to velocity and up: (vz, 0, -vx)
                const axis = new T.Vector3(v.z, 0, -v.x);
                axis.normalize();

                // distance traveled ≈ speed * dt
                // angle = distance / radius
                const radius = this._ballRadius || 1.0;
                const angle = (speedXZ * dt) / radius;
                
                const rotate_slow = speedXZ / 10;
                // rotate the ball mesh around this axis
                this._ball.rotateOnAxis(axis, -angle * rotate_slow);
            }

        }

        
        // --- collision: ball vs characters (player, goalkeeper) ---
if (this._ball && this._ballVel) {
    const pos = this._ball.position;
    const v = this._ballVel;

    const s  = this._stadiumScale || 1;
    const ox = this._stadiumX || 0;
    const oz = this._stadiumZ || 0;

    // helper to handle collision with one character that has a _root
    const collideWithChar = (ch, playerR, kickSpeedWorld) => {
        if (!ch || !ch._root) return;

        // ball world position
        let ballWX = ox + pos.x * s;
        let ballWZ = oz + pos.z * s;

        const pPos = ch._root.position;
        const px = pPos.x;
        const pz = pPos.z;

        const ballRWorld = (this._ballRadius || 1.2) * s;
        const minDist = ballRWorld + playerR;

        const dx = ballWX - px;
        const dz = ballWZ - pz;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.0001;
            const nx = dx / dist;
            const nz = dz / dist;

            // push ball out of overlap
            ballWX = px + nx * minDist;
            ballWZ = pz + nz * minDist;

            // convert back to local stadium coords
            pos.x = (ballWX - ox) / s;
            pos.z = (ballWZ - oz) / s;

            // kick/deflect the ball away from character
            const vWorldX = nx * kickSpeedWorld;
            const vWorldZ = nz * kickSpeedWorld;

            // local velocity = world velocity / scale
            v.x = vWorldX / s;
            v.z = vWorldZ / s;
            }
        };

        // collide with field player (if you have one)
        collideWithChar(this._player, 2.0, 40);

        // collide with goalkeeper (slightly bigger radius, maybe a bit softer kick)
        collideWithChar(this._goalKeeper, 6.0, 35);
    }


        

    }
}
