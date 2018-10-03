import { __require, fs } from "../utils/node";

const { remote, ipcRenderer } = __require("electron");
const { dialog } = remote;

import Chart from "../stores/Chart";
import store from "../stores/stores";
import { Fraction } from "../math";
import { guid } from "../util";

export default class BMSImporter {
  public static import() {
    dialog.showOpenDialog(
      {
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "BMS 譜面データ", extensions: ["bms", "bme"] }]
      },
      async (filenames: string[]) => {
        for (const filename of filenames) {
          const file = await fs.readFile(filename);

          this.importImplement(file.toString());
        }
      }
    );
  }

  public static importImplement(bmsChart: string) {
    console.log("BMS 譜面を読み込みます");

    const splitTokens = (source: string) => {
      var split = source.split("");

      var space = source.indexOf(" ");

      split[0] = source.substr(0, space - 1);
      split[1] = source.substr(space).trim();

      return split;
    };

    const headerN = (source: string) => {
      var tokens = splitTokens(source);

      return tokens[1];
    };

    const notes: any[] = [];

    const note = (index: number, id: number, values: string) => {
      var mc = values.match(/.{2}/g)!;

      var ln = mc.length;
      var count = 0;

      for (var c of mc) {
        var b = c;

        var index2 = count++;

        if (b.length == 0) continue;

        // xxxXX:[[11223344]]

        var value = parseInt(b, 36);

        // 休符

        if (value == 0) continue;

        var soundID = value;

        var note = { id: -1, laneIndex: 0, position: new Fraction(0, 1) }; //new Note(-1, soundID);

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

        notes.push(note);

        // フリースクラッチ
        // if (id == 17) note.id = 0;
      }
    };

    const channel = (index: number, id: number, values: string) => {
      var laneIndex = index;

      // 拡張 BPM
      if (id == 8) {
        //  bpmEx(laneIndex, values);

        return;
      }

      if (id == 9) {
        //   addStop(laneIndex, values);

        return;
      }

      // xxx02: tempo
      if (id == 2) {
        // values には 0.125 みたいな文字列が入っている
        var value = Number(values);

        //    var tempo = new Tempo(laneIndex, value);

        return;
      }

      // xxx03: BPM
      if (id == 3) {
        //     bpmN(laneIndex, values);

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
    };

    const lines = bmsChart.split("\n");

    // レーン数を算出する
    var laneLength = -1;

    for (var line of lines) {
      if (!line.match(/#\d{3}[0-9A-Z]{2}:.+/)) continue;

      var laneIndex = Number(line.substr(1, 3));

      if (laneIndex > laneLength) laneLength = laneIndex;
    }

    console.log("Lane Length: " + laneLength);

    for (var line of lines) {
      // Debug.Log(line);

      try {
        // #xxxXX:....
        if (line.match(/#\d{3}[0-9A-Z]{2}:.+/)) {
          var index = Number(line.substr(1, 3));
          var id = Number(line.substr(4, 2));
          var values = line.substr(7);

          channel(index, id, values.trim());

          continue;
        }

        /*
                    // #WAV *.wav
                    if (Regex.IsMatch(line, @"#WAV[0-9A-Z]{2} .+", RegexOptions.ECMAScript))
                    {


                        String[] s = splitTokens(line);         // トークンで分割

                        // 
                        var id_36 = line.Substring(4, 2);

                        int id = RadixConvert.ToInt32(line.Substring(4, 2), 36);


                        wavs += "" + id + ":" + s[1] + "\n";

                        BMS_Header header = new BMS_Header();

                        header.value = s[1];

                        HeaderCollection_WAV[id] = header;

                        continue;
                    }
                    
*/

        if (line.match(/#BPM .+/)) {
          const bpm = Number(line.substr(5));
          const defaultBPM = bpm;

          continue;
        }

        if (line.match(/#BPM[0-9A-F]{2} .+/)) {
          const bpm = Number(headerN(line));

          // println(bpm.ToString());

          //    BMS_Header header = new BMS_Header(line, 16);

          //  HeaderCollection_BPM.Add(header.id, header);

          continue;
        }

        if (line.match(/#STOP[0-9A-Z]{2} .+/)) {
          /*
                        BMS_Header header = new BMS_Header(line, 36);

                        int stop = header.intValue();

                        println("Stop", header.id.ToString(), stop.ToString());


                        HeaderCollection_STOP.Add(header.id, header);

                        */

          continue;
        }
      } catch (e) {
        console.log(e);
      }
    }

    console.log(notes);

    Chart.fromJSON(
      JSON.stringify({
        timeline: {
          horizontalLaneDivision: 9,
          bpmChanges: [],
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
              measureIndex: laneLength,
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
          notes: notes.map(note => ({
            guid: guid(),
            horizontalSize: 1,
            horizontalPosition: {
              numerator: note.id === -1 ? 8 : note.id,
              denominator: 9
            },
            measureIndex: note.laneIndex,
            measurePosition: note.position,
            type: "tap",
            lane: "60914b20c1205ff1563407fa2d2b233d"
          })),
          noteLines: [
            /*
            {
              head: "0ee48d556c8f535fe958305bdd441f8c",
              tail: "469b98721de9beacc68f4329936296fd"
            }
            */
          ],
          lanes: [
            {
              guid: "60914b20c1205ff1563407fa2d2b233d",
              templateName: "normal",
              division: 9,
              points: [
                "2937357cffe6bec2c44cb9c13e3b17e4",
                "a90db42627230b200865d972b31196dc"
              ]
            }
          ],
          lanePointMap: {},
          noteMap: {}
        },
        name: "新規譜面",
        audioSource: store.editor.asset.audioAssetPaths[0],
        musicGameSystemName: "BMS",
        musicGameSystemVersion: 0.1
      })
    );
  }
}
