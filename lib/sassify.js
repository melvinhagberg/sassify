'use babel';

import SassifyView from './sassify-view';
import { CompositeDisposable } from 'atom';

export default {

    sassPasteSyntaxView: null,
    modalPanel: null,
    subscriptions: null,

    activate(state) {
        this.SassifyView = new SassifyView(state.SassifyViewState);
        this.modalPanel = atom.workspace.addModalPanel({
          item: this.SassifyView.getElement(),
          visible: false
        });

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-text-editor', {
          'sassify:onPaste': () => this.onPaste()
        }));
    },

    deactivate() {
        this.modalPanel.destroy();
        this.subscriptions.dispose();
        this.sassPasteSyntaxView.destroy();
    },

    serialize() {
        return {
            SassifyViewState: this.SassifyView.serialize()
        };
    },

    onPaste() {
        let editor = atom.workspace.getActiveTextEditor()
        let copiedText = atom.clipboard.read()
        let indentColumn = editor.getCursorBufferPosition().column
        let indentTab = false
        let hasBeenJustified = false

        let justifiedCode = copiedText.split('\n').map((line, i) => {

            if (line[line.length - 1] === '{') {
                indentTab = true
                justifiedLine = line.substr(0, line.length - 1)

                if (i !== 0) {
                    justifiedLine = (' ').repeat(indentColumn) + justifiedLine
                }

                hasBeenJustified = true

            } else if (line[line.length - 1] === ';') {
                line = line.trim()

                if (indentTab) {
                    line = (' ').repeat(indentColumn) + '\t' + line
                } else {
                    if (i === 0) {
                        line = line
                    } else {
                        line = (' ').repeat(indentColumn) + line
                    }
                }

                justifiedLine = line.substr(0, line.length - 1)
                hasBeenJustified = true

            } else if (line[line.length - 1] === '}') {
                indentTab = false
                hasBeenJustified = true
                return

            } else if ( (line.trim().substr(0, 2) === '/*') && (line.trim().substr(line.trim().length - 2, 2) === '*/') ) {
                line = line.trim()
                line = line.substr(2, line.length - 4).trim()

                justifiedLine = (' ').repeat(indentColumn)

                justifiedLine = (indentTab) ? justifiedLine + '\t' : justifiedLine;
                justifiedLine += '// ' + line
                hasBeenJustified = true

            } else if (line === '') {
                return null

            } else {
                justifiedLine = line
            }

            return justifiedLine

        }).filter(item => (item !== null))
        .join('\n')

        // Set undo checkpoint
        editor.transact(function() {
            editor.insertText(copiedText, {
                select: true
            })
        })

        // Final checkpoint
        editor.transact(function() {
            editor.delete()
            editor.insertText(justifiedCode, {
                select: true,
                autoIndent: true
            })
        })

        if (hasBeenJustified) {
            let notification = atom.notifications.addSuccess('Your clipboard has been sassified', {
                dismissable: true
            })

            setTimeout(() => {
                notification.dismiss()
            }, 2500)
        }
    }

};
