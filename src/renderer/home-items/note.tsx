/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, {
  useState,
  useCallback,
  FormEvent,
  MouseEventHandler,
} from 'react';
import RichTextEditor from 'react-rte';
import { EditorState } from 'draft-js';
import { stateFromMarkdown } from 'draft-js-import-markdown';
import { FaTag, FaPlus } from 'react-icons/fa';
import { ItemMeta } from 'renderer/interfaces';
import { debounce } from '../utils';
import './item.global.scss';

interface NoteItemProps {
  onChange(val: string): void;
  createTag(tag: string): void;
  itemMeta: ItemMeta;
  tags: { id: string; name: string }[];
}

const Note = (props: NoteItemProps) => {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const createFromString = (markup: string, format: string, options?) => {
    const contentState = stateFromMarkdown(markup, options);
    const editorState = EditorState.createWithContent(
      contentState,
      RichTextEditor.decorator
    );
    return new RichTextEditor.EditorValue(editorState, { [format]: markup });
  };

  const toggleTagDropdown = () => {
    setTagDropdownOpen(!tagDropdownOpen);
  };

  const createTag = (event: MouseEventHandler<HTMLDivElement>) => {
    props.createTag(tagFilter);
    setTagFilter('');
    setTagDropdownOpen(false);
  };

  const addTagButton = (
    _setCustomControlState: (key: string, value: string) => void,
    _getCustomControlState: (key: string) => string,
    _editorState: EditorState
  ) => {
    const filteredTags: { id: string; name: string }[] = props.tags.filter(
      (tag) => tag.name.includes(tagFilter)
    );
    return (
      <div className="custom-control">
        <FaTag onClick={toggleTagDropdown} />
        {tagDropdownOpen && (
          <div className="tag-list">
            <input
              type="text"
              onChange={(e) => setTagFilter(e.target.value)}
              name="tagName"
              placeholder="Search or create tags ..."
            />

            {filteredTags.length > 0 ? (
              filteredTags.map((tag) => <div key={tag.id}>{tag.name}</div>)
            ) : (
              <div onClick={createTag}>{`Create tag '${tagFilter}'`}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const addNoteTags = (
    _setCustomControlState: (key: string, value: string) => void,
    _getCustomControlState: (key: string) => string,
    _editorState: EditorState
  ) => {
    return props.itemMeta.tags.map((id: string) => (
      <div key={id}>{props.tags.find((tag) => tag.id === id)?.name}</div>
    ));
  };

  const setDefaultVal = () => {
    const { data } = props.itemMeta;
    return data
      ? createFromString(data, 'markdown')
      : RichTextEditor.createEmptyValue();
  };

  const [value, setValue] = useState(setDefaultVal);

  const debouncedOnChange = useCallback(
    debounce(
      (val) => props.onChange(val.toString('markdown', { gfm: true })),
      3000
    ),
    [props]
  );

  const onChange = (val) => {
    setValue(val);
    debouncedOnChange(val);
  };

  return (
    <RichTextEditor
      customControls={[addTagButton, addNoteTags]}
      autoFocus
      className="notepad-container"
      value={value}
      onChange={onChange}
    />
  );
};

export default Note;
