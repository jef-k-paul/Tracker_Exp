    import React, {Component} from "react";
    import {
        Container,
        Paper,
        Typography,
        TextField,
        Button,
        Alert
    } from "@mui/material";


    import { login } from "../../services/apiServices";


    class LoginPage extends Component {

        constructor(props) {
            super(props);

            this.state = {
            accessKey: "",
            loading: false,
            error: ""
            };
        }

        handleChange = (event) => {
            this.setState({
            accessKey: event.target.value
            });
        };

        handleLogin = () => {

            this.setState({
                error : "",
                loading : true
            });

            login(this.state.accessKey)
                .then((response) => {

                    localStorage.setItem(
                        "user",
                        JSON.stringify(response.data)
                    );

                    window.location.href = "/dashboard";
                })
                .catch(() => {
                    
                    this.setState({
                        error: "Invalid Access Key",
                        loading : false
                    });
                });
        }

        render() {
            return (
            <Container maxWidth="sm">

                <Paper
                elevation={3}
                style={{
                    padding: "30px",
                    marginTop: "100px",
                    textAlign: "center"
                }}
                >

                <Typography
                    variant="h4"
                    gutterBottom
                >
                    Family Expense Tracker
                </Typography>


                {this.state.error && (
                <Alert severity="error">
                {this.state.error}
                </Alert>
                )}
                
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
                onClick={this.handleLogin}
                disabled={this.state.loading}
                style={{ marginTop: "20px" }}
            >
                {/* Login */}{this.state.loading ? "Logging In..." : "Login"}
            </Button>

            </Paper>

        </Container>
        );
    }
    }

    export default LoginPage;