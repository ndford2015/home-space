/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState, useCallback } from 'react';
import RichTextEditor from 'react-rte';
import './item.global.scss';

interface NoteItemProps {
  onChange(val: string): void;
}
const Note = (props: NoteItemProps) => {
  const [value, setValue] = useState(RichTextEditor.createEmptyValue());
  let debounceTimer: NodeJS.Timeout;
  const onChange = useCallback(
    (val: any) => {
      setValue(val);
      clearTimeout(debounceTimer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      debounceTimer = setTimeout(
        () => props.onChange(val.toString('markdown')),
        3000
      );
    },
    [props]
  );

  return (
    <RichTextEditor
      className="notepad-container"
      value={value}
      onChange={onChange}
    />
  );
};

export default Note;
