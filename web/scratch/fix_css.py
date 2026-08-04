
import sys

with open('/home/emma/Okkaz/web/src/app/page.module.css', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == '.propertyContainer {':
        continue # skip existing broken one if any
    new_lines.append(line)

# Find the spot: after .propertySection block
for i, line in enumerate(new_lines):
    if '.propertySection {' in line:
        # Find closing brace
        for j in range(i, len(new_lines)):
            if '}' in new_lines[j]:
                # Insert here
                new_lines.insert(j+2, ".propertyContainer {\n  --r: 80px; /* the radius */\n  --s: 100px; /* size of inner curve */\n  --x: 0px; /* horizontal offset */\n  --y: 80px; /* vertical offset (lengthened) */\n")
                break
        break

with open('/home/emma/Okkaz/web/src/app/page.module.css', 'w') as f:
    f.writelines(new_lines)
