import { useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  applyNodeChanges,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEditor } from "../stores/editor";
import { t } from "../i18n";
import { useAppearance } from "../stores/appearance";
import { newChoice } from "../utils/demo";
import type { Scene } from "../types/story";
type SceneNode = Node<{ scene: Scene; start: boolean }, "scene">;
function SceneCard({ data, selected }: NodeProps<SceneNode>) {
  return (
    <div className={`scene-node ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-meta">
        {data.start
          ? t("editor.start")
          : data.scene.ending
            ? t("editor.ending")
            : data.scene.autoAdvance
              ? t("editor.automaticScene")
              : t("flow.node")}
      </div>
      <strong>{data.scene.name || t("editor.newScene")}</strong>
      <p>{data.scene.text.slice(0, 95) || t("editor.textHint")}</p>
      <div className="node-footer">
        {data.scene.autoAdvance ? 1 : data.scene.choices.length} →
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { scene: SceneCard };
export function Graph() {
  const { story, selected, update, select } = useEditor();
  const { editorTheme } = useAppearance();
  const [nodes, setNodes] = useState<SceneNode[]>([]);
  const [instance, setInstance] = useState<ReactFlowInstance<SceneNode> | null>(
    null,
  );
  useEffect(() => {
    document
      .querySelector(".react-flow__attribution a")
      ?.setAttribute("aria-label", t("flow.attribution"));
  }, []);
  useEffect(() => {
    if (story)
      setNodes(
        story.scenes.map((scene) => ({
          id: scene.id,
          type: "scene",
          deletable: false,
          ariaLabel: scene.name,
          domAttributes: { "aria-roledescription": t("flow.node") },
          position: scene.position,
          data: { scene, start: scene.id === story.startSceneId },
          selected: scene.id === selected,
        })),
      );
  }, [story, selected]);
  useEffect(() => {
    const node = instance?.getNode(selected);
    if (node)
      void instance?.setCenter(node.position.x + 110, node.position.y + 70, {
        zoom: 1,
        duration: 250,
      });
  }, [selected, instance]);
  if (!story) return null;
  const edges = story.scenes.flatMap((s) =>
    (s.autoAdvance && !s.ending
      ? [
          {
            id: `${s.id}:auto`,
            text: t("editor.automaticScene"),
            targetSceneId: s.autoAdvance.targetSceneId,
          },
        ]
      : s.choices
    )
      .filter((c) => story.scenes.some((s) => s.id === c.targetSceneId))
      .map((c) => ({
        id: c.id,
        source: s.id,
        target: c.targetSceneId,
        label: c.text,
        ariaLabel: t("flow.connection", {
          source: s.name,
          target:
            story.scenes.find((scene) => scene.id === c.targetSceneId)?.name ??
            "",
          choice: c.text,
        }),
        domAttributes: { "aria-roledescription": t("flow.edge") },
        type: "smoothstep",
        style: { stroke: "var(--accent-text)" },
        labelStyle: { fill: "var(--text)", fontSize: 11 },
        labelBgStyle: { fill: "var(--surface)" },
      })),
  );
  return (
    <ReactFlow<SceneNode>
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onInit={setInstance}
      onNodesChange={(changes) => {
        setNodes((n) => applyNodeChanges(changes, n));
        const positions = changes.filter(
          (c) => c.type === "position" && c.position && c.dragging !== true,
        );
        if (positions.length)
          update((story) => {
            for (const change of positions)
              if (change.type === "position" && change.position) {
                const scene = story.scenes.find((s) => s.id === change.id);
                if (scene) scene.position = change.position;
              }
          });
      }}
      onNodeClick={(_, node) => select(node.id)}
      onNodeDragStop={(_, node) =>
        update((s) => {
          const scene = s.scenes.find((s) => s.id === node.id);
          if (scene) scene.position = node.position;
        })
      }
      onConnect={(connection) =>
        update((s) => {
          const scene = s.scenes.find((s) => s.id === connection.source);
          if (scene && connection.target) {
            if (scene.autoAdvance) {
              if (connection.target !== scene.id)
                scene.autoAdvance.targetSceneId = connection.target;
            } else scene.choices.push(newChoice(connection.target));
          }
        })
      }
      onEdgesDelete={(edges) =>
        update((s) =>
          s.scenes.forEach((scene) => {
            if (
              scene.autoAdvance &&
              edges.some((e) => e.id === `${scene.id}:auto`)
            )
              scene.autoAdvance.targetSceneId = "";
            scene.choices.forEach((c) => {
              if (edges.some((e) => e.id === c.id)) c.targetSceneId = "";
            });
          }),
        )
      }
      deleteKeyCode="Delete"
      colorMode={editorTheme === "light" ? "light" : "dark"}
      fitView
      minZoom={0.2}
      ariaLabelConfig={{
        "controls.zoomIn.ariaLabel": t("flow.zoomIn"),
        "controls.zoomOut.ariaLabel": t("flow.zoomOut"),
        "controls.fitView.ariaLabel": t("flow.fit"),
        "controls.interactive.ariaLabel": t("flow.interactive"),
        "controls.ariaLabel": t("flow.controls"),
        "minimap.ariaLabel": t("flow.map"),
        "handle.ariaLabel": t("flow.handle"),
        "node.a11yDescription.default": t("flow.instructions"),
        "node.a11yDescription.keyboardDisabled": t("flow.node"),
        "edge.a11yDescription.default": t("flow.edge"),
        "node.a11yDescription.ariaLiveMessage": ({ direction, x, y }) =>
          t("flow.moved", { direction, x, y }),
      }}
    >
      <Background color="var(--line)" gap={28} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
