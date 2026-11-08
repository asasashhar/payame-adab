#!/usr/bin/env python3
"""Remove the docx-js default cached TOC entry (hyperlink with PAGEREF _Toc1)
so it does not duplicate the first real placeholder entry."""
import sys, zipfile, shutil, re, tempfile, os

def fix(path: str) -> None:
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".docx")
    os.close(tmp_fd)
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                xml = data.decode("utf-8")
                # remove ONLY the default cached hyperlink entry (PAGEREF _Toc1),
                # keeping the paragraph and the TOC field begin/separate/end markers
                pattern = re.compile(r"<w:hyperlink[^>]*>(?:(?!</w:hyperlink>).)*?PAGEREF _Toc1(?:(?!</w:hyperlink>).)*?</w:hyperlink>", re.S)
                xml, n = pattern.subn("", xml, count=1)
                print(f"removed {n} default TOC entry hyperlink(s)")
                data = xml.encode("utf-8")
            zout.writestr(item, data)
    shutil.move(tmp_path, path)

if __name__ == "__main__":
    fix(sys.argv[1])
    print("TOC dedup done")
