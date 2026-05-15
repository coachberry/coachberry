function handleLogout() {
            if (window._handleLogout) {
                return window._handleLogout();
            }
        }

        function switchTab(tabName) {
            if (window.switchTab) {
                return window.switchTab(tabName);
            }
        }

        function handleProfileUpdate(event) {
            if (window.handleProfileUpdate) {
                return window.handleProfileUpdate(event);
            }
        }

        function handleChangePassword(event) {
            if (window.handleChangePassword) {
                return window.handleChangePassword(event);
            }
        }

        function handlePlayerProfileUpdate(event) {
            if (window.handlePlayerProfileUpdate) {
                return window.handlePlayerProfileUpdate(event);
            }
        }

        function handleCoachProfileUpdate(event) {
            if (window.handleCoachProfileUpdate) {
                return window.handleCoachProfileUpdate(event);
            }
        }

        function handleAddPlayer(event) {
            if (window.handleAddPlayer) {
                return window.handleAddPlayer(event);
            }
        }

        function handleAddTeam(event) {
            if (window.handleAddTeam) {
                return window.handleAddTeam(event);
            }
        }

        function removePlayer(index) {
            if (window.removePlayer) {
                return window.removePlayer(index);
            }
        }

        function handleSendMessage(event) {
            if (window.handleSendMessage) {
                return window.handleSendMessage(event);
            }
        }

        function openThreadModal(messageId) {
            if (window.openThreadModal) {
                return window.openThreadModal(messageId);
            }
        }

        function closeThreadModal() {
            if (window.closeThreadModal) {
                return window.closeThreadModal();
            }
        }

        function sendThreadReply() {
            if (window.sendThreadReply) {
                return window.sendThreadReply();
            }
        }

        function addPlayerTeamRow(org, age, idx) {
            if (window.addPlayerTeamRow) {
                return window.addPlayerTeamRow(org, age, idx);
            }
        }

        function removePlayerTeamRow(rowId) {
            if (window.removePlayerTeamRow) {
                return window.removePlayerTeamRow(rowId);
            }
        }

        function addCoachTeamField(name, pos, idx) {
            if (window.addCoachTeamField) {
                return window.addCoachTeamField(name, pos, idx);
            }
        }

        function removeCoachTeamField(fieldId) {
            if (window.removeCoachTeamField) {
                return window.removeCoachTeamField(fieldId);
            }
        }
    </script>
</body>
