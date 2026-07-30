import json

with open('parsed_assets_summary.json') as f:
    data = json.load(f)

for filename, info in data.items():
    print(f"\n==================================================")
    print(f"ASSET: {info['label']} ({filename})")
    print(f"==================================================")
    print(f"Materials count: {info['materialsCount']}")
    print(f"Textures count: {info['texturesCount']}")
    print(f"Images count: {info['imagesCount']}")
    print(f"\nAnimations:")
    if info['animations']:
        for anim in info['animations']:
            print(f"  [{anim['index']}] \"{anim['name']}\" (time range: {anim['minTime']}s to {anim['maxTime']:.4f}s)")
    else:
        print("  none found")
    
    print(f"\nNode Hierarchy & Bounding Boxes:")
    for n in info['nodes']:
        indent = "  " * (n['depth'] + 1)
        mesh_str = f" [MESH index={n['meshIndex']} name=\"{n['meshName']}\"]" if n['hasMesh'] else ""
        parent_str = f"\"{n['parentName']}\" [{n['parentIndex'] if n['parentIndex'] is not None else 'root'}]"
        print(f"{indent}Node [{n['index']}] \"{n['name']}\" (depth: {n['depth']}, parent: {parent_str}){mesh_str}")
        if n['bbox']:
            b = n['bbox']
            print(f"{indent}   -> Bounding Box: min:{b['min']} max:{b['max']} size:{b['size']}")
