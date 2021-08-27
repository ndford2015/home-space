/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState } from 'react';
import RichTextEditor from 'react-rte';
import './item.global.scss';

interface NoteItemProps {
  onChange(val: string): void;
}
const Note = (props: NoteItemProps) => {
  const [value, setValue] = useState(RichTextEditor.createEmptyValue());
  let debounceTimer: NodeJS.Timeout;
  const onChange = (val: any) => {
    console.log(props);
    setValue(val);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(
      () => props.onChange(val.toString('markdown')),
      3000
    );
  };
  return (
    <RichTextEditor
      className="notepad-container"
      value={value}
      onChange={onChange}
    />
  );
};

export default Note;
