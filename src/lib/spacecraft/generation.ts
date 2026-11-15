import { seededRandom, seededShuffle } from "./random.ts";
import { tileId, type Compartment, type CompartmentType, type Coordinate, type Door, type Equipment, type GenerationConfig, type Sensor, type ShapeFamily, type SpacecraftBlueprint, type SpacecraftTile } from "./types.ts";

const LABELS: Record<CompartmentType, string> = { COMMAND_BRIDGE: "Command Bridge", CREW_QUARTERS: "Crew Quarters", MEDICAL_BAY: "Medical Bay", RADIATION_SHELTER: "Radiation Storm Shelter", LABORATORY: "Laboratory", ENGINEERING_BAY: "Engineering Bay", LIFE_SUPPORT: "Life Support", STORAGE: "Storage", AIRLOCK: "Airlock", CORRIDOR: "Transit Spine", POWER_SECTION: "Power Section" };
const REQUIRED: CompartmentType[] = ["COMMAND_BRIDGE", "CREW_QUARTERS", "MEDICAL_BAY", "RADIATION_SHELTER", "LABORATORY", "ENGINEERING_BAY", "LIFE_SUPPORT", "STORAGE", "AIRLOCK"];
export const SHAPE_FAMILIES: ShapeFamily[] = ["LINEAR", "CROSS", "T", "Y", "RING", "ASYMMETRIC", "CLUSTERED", "CHAOTIC"];

function equipmentKind(type: CompartmentType): Equipment["kind"] {
  if (type === "MEDICAL_BAY") return "medical";
  if (type === "LABORATORY") return "research";
  if (type === "LIFE_SUPPORT") return "life-support";
  if (type === "POWER_SECTION" || type === "ENGINEERING_BAY") return "power";
  return "communications";
}

function normalize(config: GenerationConfig) {
  const shipSize = config.shipSize ?? "STANDARD";
  const size = shipSize === "COMPACT" ? [54, 36] : shipSize === "LARGE" ? [78, 52] : [66, 44];
  return { width: Math.max(48, Math.min(88, Math.round(config.width ?? size[0]))), height: Math.max(34, Math.min(60, Math.round(config.height ?? size[1]))), shapeFamily: config.shapeFamily ?? "LINEAR" as ShapeFamily, shipSize, compartmentCount: Math.max(9, Math.min(12, Math.round(config.compartmentCount ?? 10))), corridorComplexity: config.corridorComplexity ?? "MEDIUM" as const, asymmetry: Math.max(0, Math.min(100, config.asymmetry ?? 35)), shelterCapacity: Math.max(1, Math.min(12, Math.round(config.shelterCapacity ?? 6))), hazardDensity: Math.max(0, Math.min(100, config.hazardDensity ?? 20)) };
}

function anchors(shape: ShapeFamily, w: number, h: number): Coordinate[] {
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2), l = 3, r = w - 10, t = 2, b = h - 9;
  const all: Record<ShapeFamily, Coordinate[]> = {
    LINEAR: [{x:l,y:cy-9},{x:l+10,y:cy+3},{x:l+20,y:cy-9},{x:l+30,y:cy+3},{x:l+40,y:cy-9},{x:r,y:cy+3},{x:cx-18,y:cy+3},{x:cx-8,y:cy-9},{x:cx+2,y:cy+3},{x:cx+12,y:cy-9}],
    CROSS: [{x:l,y:cy-3},{x:r,y:cy-3},{x:cx-3,y:t},{x:cx-3,y:b},{x:cx-14,y:cy-13},{x:cx+8,y:cy-13},{x:cx-14,y:cy+6},{x:cx+8,y:cy+6},{x:l+10,y:cy-13},{x:r-10,y:cy+6}],
    T: [{x:l,y:t},{x:l+11,y:t},{x:cx-3,y:t},{x:r-11,y:t},{x:r,y:t},{x:cx-14,y:cy-2},{x:cx+8,y:cy-2},{x:cx-3,y:b},{x:cx-14,y:b},{x:cx+8,y:b}],
    Y: [{x:l+3,y:t},{x:r-3,y:t},{x:cx-19,y:cy-10},{x:cx+13,y:cy-10},{x:cx-3,y:cy-2},{x:cx-3,y:cy+7},{x:cx-3,y:b},{x:cx-14,y:b},{x:cx+8,y:b},{x:l,y:cy-2}],
    RING: [{x:l,y:t},{x:cx-3,y:t},{x:r,y:t},{x:r,y:cy-3},{x:r,y:b},{x:cx-3,y:b},{x:l,y:b},{x:l,y:cy-3},{x:cx-14,y:cy-3},{x:cx+8,y:cy-3}],
    ASYMMETRIC: [{x:l,y:cy-3},{x:l+10,y:t},{x:cx-14,y:cy-13},{x:cx-3,y:cy+5},{x:cx+8,y:t+4},{x:r,y:cy-3},{x:r-10,y:b},{x:l+4,y:b},{x:cx+12,y:cy+5},{x:r-4,y:t}],
    CLUSTERED: [{x:cx-20,y:cy-13},{x:cx-10,y:cy-13},{x:cx,y:cy-13},{x:cx+10,y:cy-13},{x:cx-20,y:cy-3},{x:cx+10,y:cy-3},{x:cx-20,y:cy+7},{x:cx-10,y:cy+7},{x:cx,y:cy+7},{x:cx+10,y:cy+7}],
    CHAOTIC: [{x:l,y:t+3},{x:l+13,y:b},{x:cx-16,y:cy-10},{x:cx-4,y:t},{x:cx+5,y:b},{x:r-13,y:t+8},{x:r,y:b-5},{x:l+4,y:cy-3},{x:cx+14,y:cy-3},{x:r-3,y:t}],
  };
  return all[shape].map(({x,y}) => ({x: Math.max(1, Math.min(w - 9, x)), y: Math.max(1, Math.min(h - 9, y))}));
}

export function generateSpacecraft(config: GenerationConfig = {}, seed = "vitalis-demo"): SpacecraftBlueprint {
  const cfg = normalize(config), { width, height } = cfg, random = seededRandom(seed);
  const tiles = new Map<string, SpacecraftTile>();
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) tiles.set(tileId(x,y), { id:tileId(x,y), x,y,type:"BLOCKED",compartmentId:null,passable:false });
  const setTile = (x:number,y:number,tile:Partial<SpacecraftTile>) => { if(x<0||y<0||x>=width||y>=height)return; const id=tileId(x,y); tiles.set(id,{...(tiles.get(id) as SpacecraftTile),...tile,id,x,y}); };
  const corridor: Compartment = { id:"comp-corridor",name:LABELS.CORRIDOR,type:"CORRIDOR",x:1,y:1,width:width-2,height:height-2,capacity:null,restrictedTo:[],equipmentIds:[],sensorIds:[] };
  const carveLine = (a:Coordinate,b:Coordinate) => { let {x,y}=a; const carve=()=>{for(let o=-1;o<=1;o++)setTile(x,y+o,{type:"CORRIDOR",passable:true,compartmentId:corridor.id});}; while(x!==b.x){carve();x+=Math.sign(b.x-x);} while(y!==b.y){carve();y+=Math.sign(b.y-y);} carve(); };
  const cy=Math.floor(height/2),cx=Math.floor(width/2);
  carveLine({x:2,y:cy},{x:width-3,y:cy});
  if (["CROSS","T","Y","CLUSTERED"].includes(cfg.shapeFamily)) carveLine({x:cx,y:2},{x:cx,y:height-3});
  if(cfg.shapeFamily==="RING"){ carveLine({x:5,y:7},{x:width-6,y:7}); carveLine({x:width-6,y:7},{x:width-6,y:height-8}); carveLine({x:width-6,y:height-8},{x:5,y:height-8}); carveLine({x:5,y:height-8},{x:5,y:7}); }
  if(cfg.shapeFamily==="Y"){carveLine({x:cx,y:cy},{x:7,y:5});carveLine({x:cx,y:cy},{x:width-8,y:5});}
  if(["ASYMMETRIC","CHAOTIC"].includes(cfg.shapeFamily)){carveLine({x:8,y:5},{x:cx-8,y:cy});carveLine({x:cx+6,y:cy},{x:width-8,y:height-7});}
  const requested: CompartmentType[] = config.includePowerSection===false?[...REQUIRED]:[...REQUIRED,"POWER_SECTION"];
  while(requested.length<cfg.compartmentCount) requested.push(requested.length%2?"LABORATORY":"STORAGE");
  const ordered=["COMMAND_BRIDGE" as CompartmentType,...seededShuffle(requested.filter(type=>type!=="COMMAND_BRIDGE"&&type!=="AIRLOCK"),random),"AIRLOCK" as CompartmentType].slice(0,cfg.compartmentCount);
  const points=anchors(cfg.shapeFamily,width,height), compartments:Compartment[]=[corridor], doors:Door[]=[], sensors:Sensor[]=[], equipment:Equipment[]=[];
  const findPlacement = (desired: Coordinate, roomWidth: number, roomHeight: number) => {
    const candidates: Coordinate[] = [];
    for (let radius = 0; radius < Math.max(width, height); radius += 2) {
      for (const dx of [0, -radius, radius]) for (const dy of [0, -radius, radius]) candidates.push({ x: desired.x + dx, y: desired.y + dy });
    }
    return candidates.find((candidate) => {
      const x = Math.max(1, Math.min(width - roomWidth - 1, candidate.x));
      const y = Math.max(1, Math.min(height - roomHeight - 1, candidate.y));
      const keepsPrimarySpineClear = y + roomHeight <= cy - 2 || y >= cy + 3;
      return keepsPrimarySpineClear && compartments.filter((room) => room.type !== "CORRIDOR").every((room) => x + roomWidth + 1 <= room.x || room.x + room.width + 1 <= x || y + roomHeight + 1 <= room.y || room.y + room.height + 1 <= y);
    }) ?? desired;
  };
  const connectToSpine = (start: Coordinate) => {
    const queue: Coordinate[] = [start], previous = new Map<string, string | null>([[tileId(start.x, start.y), null]]);
    let target: Coordinate | null = null;
    for (let cursor = 0; cursor < queue.length && !target; cursor++) {
      const current = queue[cursor], currentTile = tiles.get(tileId(current.x, current.y));
      if (currentTile?.type === "CORRIDOR" && Math.abs(current.y - cy) <= 1) { target = current; break; }
      for (const next of [{x:current.x+1,y:current.y},{x:current.x-1,y:current.y},{x:current.x,y:current.y+1},{x:current.x,y:current.y-1}]) {
        const id=tileId(next.x,next.y), tile=tiles.get(id);
        if (!tile || previous.has(id) || (tile.type !== "BLOCKED" && tile.type !== "CORRIDOR")) continue;
        previous.set(id,tileId(current.x,current.y)); queue.push(next);
      }
    }
    if (!target) {
      const { x } = start;
      let { y } = start;
      while (y !== cy) { setTile(x, y, { type:"CORRIDOR", passable:true, compartmentId:corridor.id }); y += Math.sign(cy - y); }
      setTile(x, y, { type:"CORRIDOR", passable:true, compartmentId:corridor.id });
      return;
    }
    let cursor: string | null = tileId(target.x,target.y);
    while (cursor) { const [x,y]=cursor.split(":").map(Number); setTile(x,y,{type:"CORRIDOR",passable:true,compartmentId:corridor.id}); cursor=previous.get(cursor) ?? null; }
  };
  ordered.forEach((type,index)=>{
    const point=points[index%points.length], roomWidth=7+(random()>.72?1:0), roomHeight=7+(random()>.72?1:0), placement=findPlacement(point,roomWidth,roomHeight), x=Math.max(1,Math.min(width-roomWidth-1,placement.x)), y=Math.max(1,Math.min(height-roomHeight-1,placement.y));
    const duplicate=compartments.filter(room=>room.type===type).length, id=`comp-${type.toLowerCase().replaceAll("_","-")}${duplicate?`-${duplicate+1}`:""}`, equipmentId=`equipment-${id}`, sensorId=`sensor-${id}`;
    const room:Compartment={id,name:`${LABELS[type]}${duplicate?` ${duplicate+1}`:""}`,type,x,y,width:roomWidth,height:roomHeight,capacity:type==="RADIATION_SHELTER"?cfg.shelterCapacity:null,restrictedTo:[],equipmentIds:[equipmentId],sensorIds:[sensorId]}; compartments.push(room);
    for(let ry=y;ry<y+roomHeight;ry++)for(let rx=x;rx<x+roomWidth;rx++){const edge=rx===x||rx===x+roomWidth-1||ry===y||ry===y+roomHeight-1;setTile(rx,ry,{type:edge?"WALL":type==="AIRLOCK"?"AIRLOCK":"FLOOR",passable:!edge,compartmentId:id});}
    const center={x:x+Math.floor(roomWidth/2),y:y+Math.floor(roomHeight/2)}, options=[{door:{x:center.x,y},outside:{x:center.x,y:y-1}},{door:{x:center.x,y:y+roomHeight-1},outside:{x:center.x,y:y+roomHeight}},{door:{x,y:center.y},outside:{x:x-1,y:center.y}},{door:{x:x+roomWidth-1,y:center.y},outside:{x:x+roomWidth,y:center.y}}], selected=options.sort((a,b)=>Math.abs(a.outside.x-cx)+Math.abs(a.outside.y-cy)-(Math.abs(b.outside.x-cx)+Math.abs(b.outside.y-cy)))[0], door=selected.door;
    connectToSpine(selected.outside); setTile(door.x,door.y,{type:"DOOR",passable:true,compartmentId:id});
    doors.push({id:`door-${id}`,position:door,connects:[id,corridor.id],defaultState:"OPEN"}); sensors.push({id:sensorId,kind:"dosimeter",position:center,compartmentId:id,unit:"mSv/h"}); equipment.push({id:equipmentId,kind:equipmentKind(type),label:`${LABELS[type]} system`,position:{x:center.x-1,y:center.y},compartmentId:id}); setTile(center.x-1,center.y,{type:"EQUIPMENT",passable:true,compartmentId:id});
  });
  for (const door of doors) {
    const roomId = door.connects[0];
    const outside = [{x:door.position.x+1,y:door.position.y},{x:door.position.x-1,y:door.position.y},{x:door.position.x,y:door.position.y+1},{x:door.position.x,y:door.position.y-1}]
      .find((point) => tiles.get(tileId(point.x, point.y))?.compartmentId !== roomId);
    if (outside) connectToSpine(outside);
    setTile(door.position.x, door.position.y, { type:"DOOR", passable:true, compartmentId:roomId });
  }
  return { id:`spacecraft-${seed.replace(/[^a-z0-9-]/gi,"-").toLowerCase()||"generated"}`,seed,generatorVersion:"2.0.0",shapeFamily:cfg.shapeFamily,generationConfig:{shapeFamily:cfg.shapeFamily,shipSize:cfg.shipSize,compartmentCount:cfg.compartmentCount,corridorComplexity:cfg.corridorComplexity,asymmetry:cfg.asymmetry,shelterCapacity:cfg.shelterCapacity,hazardDensity:cfg.hazardDensity},width,height,tiles:[...tiles.values()],compartments,doors,sensors,equipment,createdFor:config.missionType==="SURFACE"?"SURFACE":"TRANSIT" };
}

export function getCompartment(blueprint:SpacecraftBlueprint,compartmentId:string){return blueprint.compartments.find(c=>c.id===compartmentId)??null;}
export function getTile(blueprint:SpacecraftBlueprint,x:number,y:number){return blueprint.tiles.find(tile=>tile.x===x&&tile.y===y)??null;}
export function compartmentCenter(compartment:Compartment){return{x:compartment.x+Math.floor(compartment.width/2),y:compartment.y+Math.floor(compartment.height/2)};}
