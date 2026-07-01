import React, { Component } from "react";
import Navbar from "../../components/Navbar/Navbar";
import { Typography, Container } from "@mui/material";


class DashboardPage extends Component {
    constructor(props){
        super(props);

        const user = JSON.parse(localStorage.getItem("user"));

        this.state = {
            user
        }
    }


    render(){
        return(
        <>
            <Navbar />
            
            <Container>
                <Typography>
                    Welcome {this.state.user?.name ? this.state.user.name : "++--"}
                </Typography>

            </Container>
        </>
        )
    }
}

export default DashboardPage;