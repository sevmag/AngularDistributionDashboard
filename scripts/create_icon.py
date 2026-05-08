import cairosvg

svg_content = """<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(60,60) rotate(45)">
    <ellipse cx="0" cy="0" rx="40" ry="25" fill="none" stroke="black" stroke-width="1.5"/>
    <ellipse cx="0" cy="0" rx="28" ry="17" fill="none" stroke="black" stroke-width="1.2"/>
    <ellipse cx="0" cy="0" rx="16" ry="10" fill="none" stroke="black" stroke-width="1"/>
    <circle cx="0" cy="0" r="2.5" fill="black"/>
  </g>
</svg>"""

with open("icon.svg", "w") as f:
    f.write(svg_content)

cairosvg.svg2pdf(url="icon.svg", write_to="icon.pdf")
print("Saved as icon.pdf")