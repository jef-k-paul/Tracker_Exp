    import React, {Component} from "react";
    import {
        Container,
        Paper,
        Typography,
        TextField,
        Button,
        Alert
    } from "@mui/material";

    class LoginPage extends Component {

        constructor(props) {
            super(props);

            this.state = {
            accessKey: ""
            };
        }

        handleChange = (event) => {
            this.setState({
            accessKey: event.target.value
            });
        };

        render() {
            return (
            <Container maxWidth="sm">

                <Paper
                elevation={3}
                style={{
                    padding: "30px",
                    marginTop: "100px"
                }}
                >

                <Typography
                    variant="h4"
                    gutterBottom
                >
                    Family Expense Tracker
                </Typography>

                <TextField
                    fullWidth
                    label="Access Key"
                    value={this.state.accessKey}
                    onChange={this.handleChange}
                    margin="normal"
                />

            <Button
                variant="contained"
                fullWidth
                style={{ marginTop: "20px" }}
            >
                Login
            </Button>

            </Paper>

        </Container>
        );
    }
    }

    export default LoginPage;