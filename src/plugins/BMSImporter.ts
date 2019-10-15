import { remote } from "electron";
import * as fs from "fs";
import * as util from "util";
import { Fraction } from "../math";
import { MeasureData } from "../objects/Measure";
import Chart from "../stores/Chart";
import store from "../stores/stores";
import { guid } from "../utils/guid";
const { dialog } = remote;

type Stop = {
  value: number;
  laneIndex: number;
  position: Fraction;
};

export default class BMSImporter {
  public static import() {
    dialog.showOpenDialog(
      {
        properties: ["openFile", "multiSelections"]
        // filters: [{ name: "BMS 譜面データ", extensions: ["bms", "bme"] }]
      },
      async (filenames: string[]) => {
        for (const filename of filenames) {
          const file = await util.promisify(fs.readFile)(filename);

          this.importImplement(file.toString());
        }
      }
    );
  }

  public static importImplement(bmsChart: string) {
    console.log("BMS 譜面を読み込みます");

    const splitTokens = (source: string) => {
      const split = source.split("");

      const space = source.indexOf(" ");

      split[0] = source.substr(0, space - 1);
      split[1] = source.substr(space).trim();

      return split;
    };

    const headerN = (source: string) => {
      const tokens = splitTokens(source);

      return tokens[1];
    };

    const notes: any[] = [];

    const measures: MeasureData[] = [];

    const note = (index: number, id: number, values: string) => {
      const mc = values.match(/.{2}/g)!;

      const ln = mc.length;
      let count = 0;

      for (const c of mc) {
        const b = c;

        const index2 = count++;

        if (b.length == 0) continue;

        // xxxXX:[[11223344]]

        const value = parseInt(b, 36);

        // 休符

        if (value == 0) continue;

        const soundID = value;

        const note = { id: -1, laneIndex: 0, position: new Fraction(0, 1) }; //new Note(-1, soundID);

        note.laneIndex = index;

        note.position = new Fraction(index2, ln);

        note.id = -1;
        if (id == 16) note.id = 0;
        if (id == 11) note.id = 1;
        if (id == 12) note.id = 2;
        if (id == 13) note.id = 3;
        if (id == 14) note.id = 4;
        if (id == 15) note.id = 5;
        if (id == 18) note.id = 6;
        if (id == 19) note.id = 7;

        if (note.id === -1) continue;

        notes.push(note);

        // フリースクラッチ
        // if (id == 17) note.id = 0;
      }
    };

    const longNotes: any[][] = Array.from({ length: 8 }).map(_ => []);

    const longNote = (index: number, id: number, values: string) => {
      const mc = values.match(/.{2}/g)!;

      const ln = mc.length;
      let count = 0;

      for (const c of mc) {
        const b = c;

        const index2 = count++;

        if (b.length == 0) continue;

        // xxxXX:[[11223344]]

        const value = parseInt(b, 36);

        // 休符

        if (value == 0) continue;

        const soundID = value;

        const note = { id: -1, laneIndex: 0, position: new Fraction(0, 1) }; //new Note(-1, soundID);
        note.laneIndex = index;
        note.position = new Fraction(index2, ln);

        note.id = -1;
        if (id == 56) note.id = 0;
        if (id == 51) note.id = 1;
        if (id == 52) note.id = 2;
        if (id == 53) note.id = 3;
        if (id == 54) note.id = 4;
        if (id == 55) note.id = 5;
        if (id == 58) note.id = 6;
        if (id == 59) note.id = 7;

        if (note.id === -1) {
          throw note;
        }

        longNotes[note.id].push(note);
      }
    };

    const bpms: any[] = [];
    const exBpms = new Map<number, number>();

    const stopDefines = new Map<number, number>();
    const stops: Stop[] = [];

    const bpmN = (laneIndex: number, source: string) => {
      const values = source.match(/.{2}/g)!;

      const denominator = values.length;
      let count = 0;

      // console.log("BPM_N", values);

      for (const value of values) {
        const index = count++;

        //if (value === "00") continue;

        // 00 ~ FF
        const bpm = parseInt(value, 16);

        if (bpm === 0) continue;

        // console.log("bpm", bpm);
        bpms.push({
          bpm: bpm,
          laneIndex: laneIndex,
          position: new Fraction(index, denominator)
        });
      }
    };

    const bpmEx = (laneIndex: number, source: string) => {
      const values = source.match(/.{2}/g)!;

      const denominator = values.length;

      for (const [index, value] of values.entries()) {
        if (value === "00") continue;

        // 00 ~ FF
        const bpmIndex = parseInt(value, 16);

        bpms.push({
          bpm: exBpms.get(bpmIndex),
          laneIndex: laneIndex,
          position: new Fraction(index, denominator)
        });
      }
    };

    const parseStop = (laneIndex: number, source: string) => {
      const values = source.match(/.{2}/g)!;

      const denominator = values.length;

      for (const [index, value] of values.entries()) {
        if (value === "00") continue;

        // 00 ~ FF
        const bpmIndex = parseInt(value, 16);

        stops.push({
          value: stopDefines.get(bpmIndex)!,
          laneIndex: laneIndex,
          position: new Fraction(index, denominator)
        });
      }
    };

    const channel = (index: number, id: number, values: string) => {
      const laneIndex = index;

      // 拡張 BPM
      if (id == 8) {
        bpmEx(laneIndex, values);

        return;
      }

      // xxx09: 停止命令
      if (id == 9) {
        parseStop(laneIndex, values);
        return;
      }

      // xxx02: tempo
      if (id == 2) {
        // values には 0.125 みたいな文字列が入っている
        const value = Number(values);

        measures.push({
          index: laneIndex,
          beat: new Fraction(value, 1),
          customProps: {}
        });

        // console.log("Tempo", value, laneIndex);
        return;
      }

      // xxx03: BPM
      if (id == 3) {
        bpmN(laneIndex, values);

        return;
      }

      // 自動再生ノーツ
      if (id == 1) {
        note(index, id, values);
        return;
      }

      // ノーツ
      if (11 <= id && id <= 19) {
        note(index, id, values);

        return;
      }

      // ロングノート
      if (51 <= id && id <= 59) {
        // console.warn("ロングノート", values);

        longNote(index, id, values);

        return;
      }
    };

    const lines = bmsChart.split("\n");

    let title = "";

    // レーン数を算出する
    let laneLength = -1;

    for (const line of lines) {
      if (!line.match(/#\d{3}[0-9A-Z]{2}:.+/)) continue;

      const laneIndex = Number(line.substr(1, 3));

      if (laneIndex > laneLength) laneLength = laneIndex;
    }

    // console.log("Lane Length: " + laneLength);

    for (const line of lines) {
      // Debug.Log(line);

      try {
        // #xxxXX:....
        if (line.match(/#\d{3}[0-9A-Z]{2}:.+/)) {
          const index = Number(line.substr(1, 3));
          const id = Number(line.substr(4, 2));
          const values = line.substr(7);

          channel(index, id, values.trim());

          continue;
        }

        /*
                    // #WAV *.wav
                    if (Regex.IsMatch(line, @"#WAV[0-9A-Z]{2} .+", RegexOptions.ECMAScript))
                    {


                        String[] s = splitTokens(line);         // トークンで分割

                        // 
                        const id_36 = line.Substring(4, 2);

                        int id = RadixConvert.ToInt32(line.Substring(4, 2), 36);


                        wavs += "" + id + ":" + s[1] + "\n";

                        BMS_Header header = new BMS_Header();

                        header.value = s[1];

                        HeaderCollection_WAV[id] = header;

                        continue;
                    }
                    
*/

        if (line.match(/#TITLE .+/)) {
          title = line.substr(7).trim();
          continue;
        }

        if (line.match(/#BPM .+/)) {
          const bpm = Number(line.substr(5));

          console.log("default bpm", bpm);

          bpms.push({
            bpm: bpm,
            laneIndex: 0,
            position: new Fraction(0, 1)
          });

          continue;
        }

        // 拡張 BPM
        if (line.match(/#BPM[0-9A-F]{2} .+/)) {
          const bpm = Number(headerN(line));

          const id = parseInt(line.substr(4, 2), 16);

          exBpms.set(id, bpm);

          continue;
        }

        // STOP
        if (line.match(/#STOP[0-9A-F]{2} .+/)) {
          const value = Number(headerN(line));
          const id = parseInt(line.substr(5, 2), 16);
          stopDefines.set(id, value);
          continue;
        }
      } catch (e) {
        console.log(e);
      }
    }

    console.log(notes, bpms, longNotes);

    const toNote = (note: any) => ({
      guid: guid(),
      horizontalSize: 1,
      horizontalPosition: {
        numerator: note.id,
        denominator: 8
      },
      measureIndex: note.laneIndex,
      measurePosition: note.position,
      type: "tap",
      lane: "60914b20c1205ff1563407fa2d2b233d",
      layer: "<layer>",
      editorProps: {}
    });

    const noteLines: any[] = [];

    const notes2: any[] = [];

    for (const longNote of longNotes) {
      // ノートを 2 個ずつ繋ぐ
      for (let i = 0; i < longNote.length / 2; ++i) {
        const head = toNote(longNote[i * 2 + 0]);
        const tail = toNote(longNote[i * 2 + 1]);

        noteLines.push({
          head: head.guid,
          tail: tail.guid
        });

        notes2.push(head, tail);
      }
    }

    const maxMeasureIndex = Math.max(...measures.map(m => m.index));

    const newMeasures: MeasureData[] = Array(maxMeasureIndex + 1)
      .fill(0)
      .map((_, index) => {
        return {
          index,
          beat: new Fraction(4, 4),
          editorProps: { time: 0 },
          customProps: {}
        };
      });

    for (const measure of measures) {
      newMeasures[measure.index].beat = measure.beat;
    }

    Chart.fromJSON(
      JSON.stringify({
        version: 2,
        layers: [
          {
            guid: "<layer>",
            name: "defaultLayer",
            visible: true,
            lock: true
          }
        ],
        timeline: {
          speedChanges: [],
          horizontalLaneDivision: 8,
          otherObjects: [
            ...bpms.map(bpm => ({
              type: 0,
              measureIndex: bpm.laneIndex,
              measurePosition: bpm.position,
              value: bpm.bpm,
              guid: guid()
            })),
            ...stops.map(stop => ({
              type: 2,
              measureIndex: stop.laneIndex,
              measurePosition: stop.position,
              value: stop.value,
              guid: guid()
            }))
          ],
          lanePoints: [
            {
              measureIndex: 0,
              measurePosition: {
                numerator: 0,
                denominator: 1
              },
              guid: "2937357cffe6bec2c44cb9c13e3b17e4",
              horizontalSize: 1,
              templateName: "normal",
              horizontalPosition: {
                numerator: 0,
                denominator: 1
              }
            },
            {
              measureIndex: laneLength + 1,
              measurePosition: {
                numerator: 0,
                denominator: 1
              },
              guid: "a90db42627230b200865d972b31196dc",
              horizontalSize: 1,
              templateName: "normal",
              horizontalPosition: {
                numerator: 0,
                denominator: 1
              }
            }
          ],
          notes: notes
            .map(toNote)
            .concat(notes2)
            .map(note => {
              (note as any).customProps = {
                color:
                  note.horizontalPosition.numerator === -1
                    ? "#666666"
                    : note.horizontalPosition.numerator === 0
                    ? "#ff0000"
                    : note.horizontalPosition.numerator % 2
                    ? "#ffffff"
                    : "#0000ff"
              };
              return note;
            }),
          noteLines: noteLines,
          lanes: [
            {
              guid: "60914b20c1205ff1563407fa2d2b233d",
              templateName: "normal",
              division: 8,
              points: [
                "2937357cffe6bec2c44cb9c13e3b17e4",
                "a90db42627230b200865d972b31196dc"
              ]
            }
          ],
          measures: newMeasures,
          lanePointMap: {},
          noteMap: {}
        },
        startTime: 0,
        name: "新規譜面",
        audioSource: title + ".wav",
        musicGameSystemName: "BMS",
        musicGameSystemVersion: 0.1
      })
    );
  }
}
