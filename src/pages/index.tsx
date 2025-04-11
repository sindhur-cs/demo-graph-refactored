import React from "react";
import { useRouter } from "next/router";
import { useMantineColorScheme } from "@mantine/core";
import "@mantine/dropzone/styles.css";
import styled from "styled-components";
import Cookie from "js-cookie";
import { Editor } from "src/containers/Editor";
import useConfig from "src/store/useConfig";
import useFile from "src/store/useFile";

export const StyledPageWrapper = styled.div`
  height: calc(100vh - 27px);
  width: 100%;

  @media only screen and (max-width: 320px) {
    height: 100vh;
  }
`;

export const StyledEditorWrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const EditorPage = () => {
  const { query, isReady } = useRouter();
  const { setColorScheme } = useMantineColorScheme();
  const checkEditorSession = useFile(state => state.checkEditorSession);
  const darkmodeEnabled = useConfig(state => state.darkmodeEnabled);
  const [upgradeVisible, setUpgradeVisible] = React.useState(false);

  React.useEffect(() => {
    const isUpgradeShown = Cookie.get("upgrade_shown");
    if (!isUpgradeShown) setUpgradeVisible(true);
  }, []);

  React.useEffect(() => {
    if (isReady) checkEditorSession(query?.json);
  }, [checkEditorSession, isReady, query]);

  React.useEffect(() => {
    setColorScheme(darkmodeEnabled ? "dark" : "light");
  }, [darkmodeEnabled, setColorScheme]);

  return (
    <StyledEditorWrapper>
      <StyledPageWrapper>
        <StyledEditorWrapper>
          <Editor />
        </StyledEditorWrapper>
      </StyledPageWrapper>
    </StyledEditorWrapper>
  );
};

export default EditorPage;
